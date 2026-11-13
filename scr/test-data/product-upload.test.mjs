import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import jwt from "jsonwebtoken";
import { chromium, expect } from "@playwright/test";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mira-upload-test-"));
process.env.PRODUCT_UPLOAD_DIR = directory;
process.env.JWT_SECRET = "isolated-upload-test-secret-with-32-characters";
const { default: app } = await import("../server/dist/app.js");
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const token = jwt.sign(
  { id: "000000000000000000000001", role: "admin" },
  process.env.JWT_SECRET,
);
const customer = jwt.sign(
  { id: "000000000000000000000002", role: "customer" },
  process.env.JWT_SECRET,
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=",
  "base64",
);
const upload = (body, accessToken = token, type = "image/png") =>
  fetch(`${base}/api/uploads/products`, {
    method: "POST",
    headers: {
      "Content-Type": type,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
  });
let browser;
try {
  assert.equal((await upload(png, "")).status, 401);
  assert.equal((await upload(png, customer)).status, 403);
  assert.equal((await upload(Buffer.from("fake PNG"))).status, 400);
  assert.equal(
    (await upload(Buffer.from("<svg/>"), token, "image/svg+xml")).status,
    400,
  );
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await fs.readdir(directory)).length, 0);
  const response = await upload(png);
  assert.equal(response.status, 201);
  const saved = await response.json();
  assert.match(saved.url, /^\/api\/uploads\/products\/[\da-f-]+\.png$/);
  const image = await fetch(base + saved.url);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(image.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  console.log(
    "PASS upload authorization, size/type validation and persistent image retrieval",
  );

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let product = {
    _id: "000000000000000000000003",
    name: "Nhẫn kiểm thử",
    slug: "upload-test",
    category: "Nhẫn",
    material: "Bạc 925",
    price: 500000,
    stock: 10,
    images: ["/placeholder.svg", "/products/nhan-bac-flora.svg"],
  };
  let writes = [];
  let uploads = 0;
  let rejectUpload = false;
  let writable = false;
  let catalogReads = 0;
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/products/write-status")
      return route.fulfill({
        status: writable ? 200 : 503,
        json: writable
          ? { writable: true }
          : {
              message: "Hiện chỉ đọc được dữ liệu, primary chưa kết nối được.",
            },
      });
    if (pathname.startsWith("/api/uploads/")) {
      if (route.request().method() === "POST") {
        uploads++;
        if (rejectUpload)
          return route.fulfill({
            status: 500,
            json: { message: "Không thể tải ảnh thử nghiệm" },
          });
      }
      const result = await route.fetch({ url: base + pathname });
      return route.fulfill({ response: result });
    }
    if (pathname.startsWith("/api/products")) {
      if (["POST", "PUT"].includes(route.request().method())) {
        const body = route.request().postDataJSON();
        writes.push(body);
        product = { ...product, ...body };
        return route.fulfill({ status: 200, json: product });
      }
      catalogReads++;
      return route.fulfill({ json: [product] });
    }
    return route.fulfill({ json: pathname === "/api/orders" ? [] : {} });
  });
  await page.addInitScript(
    ({ token }) => {
      localStorage.setItem("mira_token", token);
      localStorage.setItem(
        "mira_user",
        JSON.stringify({ role: "admin", name: "Upload Test" }),
      );
    },
    { token },
  );
  await page.goto(process.env.UI_TEST_URL || "http://127.0.0.1:5173/admin");
  await page.getByRole("button", { name: "Sản phẩm", exact: true }).click();
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  await page.locator("#product-image-file").setInputFiles({
    name: "ring.jpg",
    mimeType: "image/jpeg",
    buffer: await fs.readFile("scr/client/public/editorial/rings.jpg"),
  });
  await expect(page.getByText("ring.jpg", { exact: true })).toBeVisible();
  await expect(page.getByAltText("Xem trước ảnh sản phẩm")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await fs.mkdir("scr/test-data/results", { recursive: true });
  await page.getByAltText("Xem trước ảnh sản phẩm").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "scr/test-data/results/admin-image-upload.png",
  });
  const readsBeforeSave = catalogReads;
  await page.getByRole("button", { name: "LƯU SẢN PHẨM", exact: true }).click();
  await expect(page.locator(".modal-error")).toContainText("chỉ đọc");
  await expect(page.getByText("ring.jpg", { exact: true })).toBeVisible();
  assert.equal(
    uploads,
    0,
    "Unavailable primary must be detected before file upload",
  );
  assert.equal(writes.length, 0);
  writable = true;
  rejectUpload = true;
  await page.getByRole("button", { name: "LƯU SẢN PHẨM", exact: true }).click();
  await expect(page.locator(".modal-error")).toContainText("Không thể tải ảnh");
  assert.equal(writes.length, 0);
  rejectUpload = false;
  await page.getByRole("button", { name: "LƯU SẢN PHẨM", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  assert.match(writes[0].images[0], /^\/api\/uploads\/products\//);
  assert.equal(writes[0].images[1], "/products/nhan-bac-flora.svg");
  assert.equal(
    writes[0].stock,
    undefined,
    "Image edit must not overwrite inventory",
  );
  assert.equal(
    catalogReads,
    readsBeforeSave,
    "A confirmed edit must not be replaced by a stale secondary read",
  );
  await expect(
    page.locator(".product-admin-table .product-cell > img"),
  ).toHaveAttribute("src", writes[0].images[0]);
  await page
    .getByRole("button", { name: "THÊM SẢN PHẨM", exact: true })
    .click();
  await page.getByLabel("Tên sản phẩm", { exact: true }).fill("Nhẫn ảnh mới");
  await page.getByLabel("Giá bán", { exact: true }).fill("300000");
  await page.getByLabel("Tồn kho", { exact: true }).fill("5");
  await page.locator("#product-image-file").setInputFiles({
    name: "not-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.locator(".modal-error")).toContainText("tối đa 5 MB");
  await page
    .locator("#product-image-file")
    .setInputFiles({ name: "new.png", mimeType: "image/png", buffer: png });
  await page
    .getByRole("button", { name: "Bỏ tệp đã chọn", exact: true })
    .click();
  await expect(page.getByAltText("Xem trước ảnh sản phẩm")).toHaveCount(0);
  await page
    .locator("#product-image-file")
    .setInputFiles({ name: "new.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "LƯU SẢN PHẨM", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  assert.match(writes[1].images[0], /^\/api\/uploads\/products\//);
  assert.equal(uploads, 3);
  assert.deepEqual(errors, []);
  console.log(
    "PASS admin file picker, preview, invalid selection, removal, failed upload retry, creation and image edits preserving gallery/inventory",
  );
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  assert.equal(
    path.dirname(path.resolve(directory)),
    path.resolve(os.tmpdir()),
  );
  assert.ok(path.basename(directory).startsWith("mira-upload-test-"));
  await fs.rm(directory, { recursive: true, force: true });
}
