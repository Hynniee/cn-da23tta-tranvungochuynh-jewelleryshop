import { createRequire } from "node:module";
import dns from "node:dns";
import { fileURLToPath } from "node:url";

const requireServer = createRequire(
  new URL("../../scr/server/package.json", import.meta.url),
);
const mongoose = requireServer("mongoose");
requireServer("dotenv").config({
  path: fileURLToPath(new URL("../../scr/server/.env", import.meta.url)),
  quiet: true,
});
const uri = process.env.MONGO_URI || "";
const dnsServers = process.env.MONGO_DNS_SERVERS?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);
if (dnsServers?.length) dns.promises.setServers(dnsServers);

try {
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri) || uri.includes("<")) {
    throw Object.assign(new Error(), { code: "INVALID_URI" });
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    readPreference:
      process.env.MONGO_READ_PREFERENCE === "primaryPreferred"
        ? "primaryPreferred"
        : "primary",
  });
  const count = await mongoose.connection
    .collection("products")
    .countDocuments();
  console.log(
    `MongoDB đã kết nối. Database: ${mongoose.connection.name}. Sản phẩm: ${count}.`,
  );
  try {
    await mongoose.connection.db
      .admin()
      .command({ ping: 1 }, { readPreference: "primary", timeoutMS: 3000 });
    console.log(
      "Primary truy cập được; kết nối phục vụ ghi dữ liệu đã sẵn sàng.",
    );
  } catch {
    process.exitCode = 2;
    console.warn(
      "Chỉ đọc được từ secondary. Primary chưa truy cập được; các thao tác ghi chưa sẵn sàng. Dữ liệu đọc dự phòng có thể chậm đồng bộ.",
    );
  }
  if (!count)
    console.log(
      "Collection products đang rỗng. Kiểm tra tên database và collection trong Atlas trước khi nhập dữ liệu.",
    );
} catch (error) {
  // Never print raw driver messages: they may contain connection details.
  const nodes = [...(error.reason?.servers?.values() || [])];
  const code =
    error.code ||
    error.cause?.code ||
    nodes
      .map((node) => node.error?.cause?.code || node.error?.code)
      .find(Boolean);
  const safeCode =
    typeof code === "string" && /^[A-Z0-9_]+$/.test(code)
      ? code
      : "CONNECTION_FAILED";
  console.error(`MongoDB chưa kết nối: ${safeCode}.`);
  if (safeCode.includes("TLS") || safeCode.includes("SSL")) {
    console.error(
      "Bắt tay TLS thất bại trước bước xác thực. Kiểm tra cluster Active, IP Access List của Atlas và phần mềm chặn mạng/TLS trên máy.",
    );
  } else if (
    ["ETIMEOUT", "ECONNREFUSED", "ENOTFOUND", "ESERVFAIL"].includes(safeCode)
  ) {
    console.error(
      "Kiểm tra DNS, đường truyền và cấu hình MONGO_DNS_SERVERS trong scr/server/.env.",
    );
  } else if (error.code === 18) {
    console.error(
      "Atlas từ chối xác thực. Kiểm tra Database Access, mật khẩu và authSource.",
    );
  }
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
