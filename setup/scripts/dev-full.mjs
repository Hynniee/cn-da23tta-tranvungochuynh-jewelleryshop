import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import net from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
const root = fileURLToPath(new URL("../../", import.meta.url));
const requireServer = createRequire(
  new URL("../../scr/server/package.json", import.meta.url),
);
requireServer("dotenv").config({
  path: path.join(root, "scr/server/.env"),
  quiet: true,
});
const children = [];
let mongo;
let closing = false;
async function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  await Promise.all(
    children
      .filter((c) => c.exitCode === null && c.signalCode === null)
      .map(
        (child) =>
          new Promise((resolve) => {
            child.once("exit", resolve);
            child.kill();
          }),
      ),
  );
  if (mongo) await mongo.stop();
  process.exitCode = code;
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
function start(args, cwd, env) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["inherit", "inherit", "inherit"],
    windowsHide: true,
  });
  children.push(child);
  return child;
}
async function freePort(initial) {
  for (let port = initial; port < initial + 25; port++) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "0.0.0.0", () => server.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error(`Không tìm được cổng trống từ ${initial}`);
}
try {
  const apiPort = await freePort(Number(process.env.PORT || 5001));
  const webPort = await freePort(Number(process.env.WEB_PORT || 5173));
  const localDir = path.join(root, ".local-data");
  await fs.mkdir(localDir, { recursive: true });
  const secretFile = path.join(localDir, "jwt-secret");
  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.startsWith("change_")) {
    try {
      jwtSecret = (await fs.readFile(secretFile, "utf8")).trim();
    } catch {
      jwtSecret = randomBytes(48).toString("hex");
      await fs.writeFile(secretFile, jwtSecret, { mode: 0o600 });
    }
  }
  let uri = process.env.MONGO_URI;
  if (!uri || uri.includes("CLUSTER.mongodb.net") || uri.includes("<")) {
    const dbPath = path.join(localDir, "mongodb");
    await fs.mkdir(dbPath, { recursive: true });
    mongo = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: "wiredTiger", dbName: "mira_local" },
    });
    uri = mongo.getUri("mira_local");
    const seed = start(
      ["--import", "tsx", "src/scripts/seed-catalog.ts"],
      path.join(root, "scr/server"),
      { MONGO_URI: uri },
    );
    await new Promise((resolve, reject) => {
      seed.once("error", reject);
      seed.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error("Không khởi tạo được danh mục")),
      );
    });
  }
  const env = {
    MONGO_URI: uri,
    JWT_SECRET: jwtSecret,
    PORT: String(apiPort),
    CLIENT_URL: `http://localhost:${webPort},http://127.0.0.1:${webPort}`,
  };
  const api = start(
    ["--import", "tsx", "src/index.ts"],
    path.join(root, "scr/server"),
    env,
  );
  const vite = start(
    [
      path.join(root, "node_modules/vite/bin/vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
      "--strictPort",
    ],
    path.join(root, "scr/client"),
    { API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` },
  );
  for (const child of [api, vite]) {
    child.once("error", (error) => {
      console.error(error.message);
      shutdown(1);
    });
    child.once("exit", (code) => {
      if (!closing) shutdown(code || 0);
    });
  }
  console.log(
    `MIRA đầy đủ: http://localhost:${webPort} (API ${apiPort}). Đăng ký tài khoản để đặt hàng; dữ liệu local lưu trong .local-data/.`,
  );
} catch (error) {
  console.error(error);
  await shutdown(1);
}
