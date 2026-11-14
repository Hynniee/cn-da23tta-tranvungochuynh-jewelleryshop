import assert from "node:assert/strict";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { cartHasStock, reconcileItems } from "../client/src/store/cart.ts";
import { canIncreaseQuantity } from "../client/src/models/cart.model.ts";
process.env.JWT_SECRET = "inventory-test-secret-with-32-characters";
const root = fileURLToPath(new URL("../../", import.meta.url));
let mongo, server, vite, browser;
try {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { default: app } = await import("../server/dist/app.js");
  const { default: Product } = await import("../server/dist/models/Product.js");
  const { default: Order } = await import("../server/dist/models/Order.js");
  const { default: User } = await import("../server/dist/models/User.js");
  const { provinces } =
    await import("../server/dist/services/shipping-address.service.js");
  const buyer = await User.create({
    name: "Inventory buyer",
    email: "inventory@example.test",
    password: "unused",
  });
  const admin = await User.create({
    name: "Inventory admin",
    email: "inventory-admin@example.test",
    password: "unused",
    role: "admin",
  });
  const sign = (user) =>
    jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET);
  const accessToken = sign(buyer),
    adminToken = sign(admin);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  async function api(
    url,
    { method = "GET", body, status = 200, token = accessToken } = {},
  ) {
    const response = await fetch(`${base}/api${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body && JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, `${url}: ${JSON.stringify(data)}`);
    return data;
  }
  const ring = await api("/products", {
    method: "POST",
    token: adminToken,
    status: 201,
    body: {
      name: "Nhẫn tồn kho size",
      slug: "inventory-ring",
      category: "Nhẫn",
      material: "Bạc",
      price: 1000000,
      stock: 999,
      sizes: ["12", "14", "16"],
      sizeStocks: [
        { size: "12", stock: 3 },
        { size: "14", stock: 2 },
        { size: "16", stock: 0 },
      ],
      images: ["/placeholder.svg"],
    },
  });
  assert.equal(ring.stock, 5);
  for (const rows of [
    [{ size: "12", stock: -1 }],
    [{ size: "12", stock: 1.5 }],
    [
      { size: "12", stock: 1 },
      { size: "12", stock: 2 },
    ],
  ])
    await api(`/products/${ring._id}`, {
      method: "PUT",
      token: adminToken,
      status: 400,
      body: { sizeStocks: rows },
    });
  console.log(
    "PASS admin validates per-size inventory and derives total stock",
  );
  const customer = {
    name: buyer.name,
    phone: "0901234567",
    provinceCode: provinces[0].code,
    wardCode: provinces[0].wards[0].code,
    addressLine: "12 Test Street",
  };
  const payload = (items) => ({
    items: items.map((item) => ({ product: ring._id, ...item })),
    customer,
    paymentMethod: "COD",
  });
  await api("/orders", {
    method: "POST",
    status: 409,
    body: payload([{ size: "14", quantity: 3 }]),
  });
  await api("/promotions/quote", {
    method: "POST",
    status: 409,
    body: payload([
      { size: "14", quantity: 1 },
      { size: "14", quantity: 2, engraving: "A" },
    ]),
  });
  const order = await api("/orders", {
    method: "POST",
    status: 201,
    body: payload([
      { size: "12", quantity: 2 },
      { size: "14", quantity: 1 },
    ]),
  });
  let saved = await Product.findById(ring._id).lean();
  assert.deepEqual(
    saved.sizeStocks.map((row) => row.stock),
    [1, 1, 0],
  );
  assert.equal(saved.stock, 2);
  await api(`/orders/${order._id}/cancel`, { method: "PATCH", body: {} });
  saved = await Product.findById(ring._id).lean();
  assert.deepEqual(
    saved.sizeStocks.map((row) => row.stock),
    [3, 2, 0],
  );
  assert.equal(saved.stock, 5);
  await api(`/orders/${order._id}/cancel`, {
    method: "PATCH",
    body: {},
    status: 400,
  });
  assert.equal((await Product.findById(ring._id)).stock, 5);
  console.log(
    "PASS quotes aggregate same-size quantities; orders and cancellations change the correct size exactly once",
  );
  const concurrent = await Promise.allSettled(
    [1, 2].map(() =>
      api("/orders", {
        method: "POST",
        status: 201,
        body: payload([{ size: "14", quantity: 2 }]),
      }),
    ),
  );
  assert.equal(
    concurrent.filter((row) => row.status === "fulfilled").length,
    1,
  );
  saved = await Product.findById(ring._id).lean();
  assert.equal(saved.sizeStocks.find((row) => row.size === "14").stock, 0);
  assert.equal(saved.stock, 3);
  console.log(
    "PASS concurrent buyers cannot oversell one size while other sizes remain available",
  );
  // If order persistence fails after reservation, every reserved size is restored.
  const create = Order.create;
  Order.create = async () => {
    throw new Error("intentional persistence failure");
  };
  try {
    await api("/orders", {
      method: "POST",
      status: 500,
      body: payload([{ size: "12", quantity: 1 }]),
    });
  } finally {
    Order.create = create;
  }
  assert.equal((await Product.findById(ring._id)).stock, 3);
  console.log("PASS failed order creation restores reserved inventory");
  const completed = concurrent.find((row) => row.status === "fulfilled").value;
  await Order.updateOne(
    { _id: completed._id },
    { status: "completed", paymentStatus: "PAID" },
  );
  await Order.updateOne({ _id: order._id }, { paymentStatus: "PAID" });
  const stats = await api("/analytics", { token: adminToken });
  assert.equal(stats.commerce.totalOrders, 2);
  assert.equal(stats.commerce.revenueOrders, 1);
  assert.equal(stats.commerce.revenue, completed.total);
  assert.equal(stats.commerce.bestSellers[0].quantity, 2);
  await api("/analytics", { status: 403 });
  console.log(
    "PASS commerce statistics count cancelled orders, exclude them from revenue, and enforce admin access",
  );
  const cartItem = {
    _id: ring._id,
    name: ring.name,
    price: ring.price,
    image: "",
    size: "12",
    quantity: 2,
  };
  const reconciled = reconcileItems(
    [cartItem, { ...cartItem, size: "14", quantity: 1 }],
    [await api(`/products/${ring.slug}`)],
  );
  assert.equal(reconciled[0].stock, 3);
  assert.equal(reconciled[1].stock, 0);
  assert.equal(cartHasStock(reconciled), false);
  assert.equal(canIncreaseQuantity(reconciled, 0), true);
  assert.equal(
    cartHasStock([
      { ...reconciled[0], quantity: 2 },
      { ...reconciled[0], quantity: 2, engraving: "A" },
    ]),
    false,
  );
  console.log(
    "PASS cart checks each size separately and combines engraving variants of the same size",
  );
  const legacy = await Product.create({
    name: "Legacy ring",
    slug: "legacy-inventory",
    category: "Nhẫn",
    material: "Bạc",
    price: 1000000,
    stock: 5,
    sizes: ["12", "14"],
  });
  const legacyView = await api(`/products/${legacy.slug}`);
  assert.deepEqual(
    legacyView.sizeStocks.map((row) => row.stock),
    [3, 2],
  );
  assert.equal(legacyView.inventoryEstimated, true);
  assert.equal(
    (await Product.findById(legacy._id).lean()).sizeStocks,
    undefined,
  );
  const legacyOrder = await api("/orders", {
    method: "POST",
    status: 201,
    body: {
      customer,
      paymentMethod: "COD",
      items: [{ product: String(legacy._id), size: "14", quantity: 1 }],
    },
  });
  assert.deepEqual(
    (await Product.findById(legacy._id).lean()).sizeStocks.map(
      (row) => row.stock,
    ),
    [3, 1],
  );
  await api(`/orders/${legacyOrder._id}/cancel`, { method: "PATCH", body: {} });
  assert.deepEqual(
    (await Product.findById(legacy._id).lean()).sizeStocks.map(
      (row) => row.stock,
    ),
    [3, 2],
  );
  console.log(
    "PASS legacy inventory is distributed without changing total and persists safely on first purchase",
  );

  const manySizes = await Product.create({
    name: "Nhẫn nhiều kích cỡ",
    slug: "many-size-inventory",
    category: "Nhẫn",
    material: "Bạc",
    price: 1000000,
    stock: 30,
    sizes: Array.from({ length: 15 }, (_, i) => String(i + 6)),
  });
  process.env.API_PROXY_TARGET = base;
  vite = await createServer({
    configFile: path.join(root, "scr/client/vite.config.ts"),
    root: path.join(root, "scr/client"),
    server: { host: "127.0.0.1", port: 0 },
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}/product/${ring.slug}`);
  await expect(page.locator(".pd-stock-status")).toHaveText(
    "Chọn size để xem tồn kho",
  );
  await expect(page.getByLabel("Số lượng", { exact: true })).toBeDisabled();
  await expect(page.locator(".pd-subtotal strong")).toHaveText("—");
  await expect(
    page.locator(".pd-sizes").getByRole("button", { name: "14", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".pd-sizes")
    .getByRole("button", { name: "12", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tăng số lượng", exact: true })
    .click();
  await expect(page.getByLabel("Số lượng", { exact: true })).toHaveValue("2");
  await expect(page.locator(".pd-stock-status")).toHaveText("Còn 3 sản phẩm");
  await expect(page.locator(".pd-subtotal strong")).toHaveText("2.000.000₫");
  await page.locator(".pd-purchase-summary").screenshot({
    path: path.join(root, ".local-data/detail-purchase-desktop.png"),
  });
  await page
    .getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("mira_cart"))[0].quantity,
    ),
    2,
  );
  await page
    .getByRole("button", { name: "Tăng số lượng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tăng số lượng", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(root, ".local-data/inventory-detail-mobile.png"),
    fullPage: true,
  });

  await page.locator(".pd-purchase-summary").screenshot({
    path: path.join(root, ".local-data/detail-purchase-mobile.png"),
  });
  await page.setViewportSize({ width: 320, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator(".pd-purchase-summary").screenshot({
    path: path.join(root, ".local-data/detail-purchase-320.png"),
  });
  await page.getByRole("button", { name: "MUA NGAY", exact: true }).click();
  await expect(page).toHaveURL(/checkout\?buyNow=1/);
  assert.equal(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("mira_buy_now")).quantity,
    ),
    3,
  );
  console.log(
    "PASS detail quantity controls enforce size stock and carry quantity to cart and buy-now checkout",
  );
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("mira_token", token);
      localStorage.setItem("mira_user", JSON.stringify(user));
    },
    { token: adminToken, user: { name: admin.name, role: "admin" } },
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${url}/admin?tab=analytics`);
  await expect(
    page.getByText("Thống kê kinh doanh", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Đơn hàng theo trạng thái", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sản phẩm bán chạy", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(root, ".local-data/inventory-statistics-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(root, ".local-data/inventory-statistics-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${url}/admin?tab=products`);
  const inventoryRow = page
    .locator(".table-row")
    .filter({ hasText: manySizes.name });
  const stockToggle = inventoryRow.getByRole("button", {
    name: "15 kích cỡ",
    exact: true,
  });
  await expect(stockToggle).toHaveAttribute("aria-expanded", "false");
  assert.ok((await inventoryRow.boundingBox()).height < 110);
  await stockToggle.click();
  await expect(page.locator(".inventory-size-item")).toHaveCount(15);
  await expect(page.locator(".inventory-size-item").first()).toContainText(
    "Size 6",
  );
  await page
    .locator(".product-admin-table")
    .screenshot({
      path: path.join(root, ".local-data/admin-inventory-expanded.png"),
    });
  assert.deepEqual(
    await page
      .locator("button")
      .evaluateAll((buttons) => [
        ...new Set(
          buttons.map((button) => getComputedStyle(button).borderRadius),
        ),
      ]),
    ["8px"],
  );
  await stockToggle.click();
  await expect(page.locator(".product-inventory-panel")).toHaveCount(0);

  await page
    .locator(".table-row")
    .filter({ hasText: ring.name })
    .getByRole("button", { name: "Sửa", exact: true })
    .click();
  await expect(page.getByLabel("Tồn kho size 12", { exact: true })).toHaveValue(
    "3",
  );
  await page.getByLabel("Tồn kho size 12", { exact: true }).fill("7");
  // Save through the product editor to verify request serialization and confirmed total.
  await page
    .getByRole("button", { name: "LƯU SẢN PHẨM", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  assert.equal((await Product.findById(ring._id)).stock, 7);
  assert.deepEqual(errors, []);
  console.log(
    "PASS admin renders commerce reports and edits individual size stock",
  );
} finally {
  await browser?.close();
  await vite?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo?.stop();
}
