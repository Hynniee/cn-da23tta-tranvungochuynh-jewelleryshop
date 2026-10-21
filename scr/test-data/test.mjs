import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const base = "http://127.0.0.1:5107/api";
const children = [];
let mongo, browser;
let checks = 0;
const logs = [];
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log(`PASS ${label}`);
};
function start(file, cwd, env = {}, args = []) {
  const child = spawn(process.execPath, [file, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.on("data", (data) => logs.push(String(data)));
  child.stderr.on("data", (data) => logs.push(String(data)));
  children.push(child);
  return child;
}
async function waitFor(url, predicate = () => true) {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(url);
      const body = await response.json();
      if (response.ok && predicate(body)) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out: ${url}\n${logs.join("")}`);
}
async function api(
  endpoint,
  { method = "GET", body, token, status = 200, headers = {} } = {},
) {
  const response = await fetch(base + endpoint, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${endpoint}: ${JSON.stringify(data)}`,
  );
  return data;
}
const customer = {
  name: "MIRA Test",
  phone: "0901234567",
  email: "test@example.com",
  address: "TP HCM",
};
const sign = (body) =>
  crypto
    .createHmac("sha256", "test-payment-secret")
    .update(JSON.stringify(body))
    .digest("hex");
try {
  // Refuse to touch an existing development server.
  for (const port of [5107, 5187]) {
    const net = await import("node:net");
    await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", () =>
        reject(
          new Error(
            `Port ${port} is busy; stop the development server before testing`,
          ),
        ),
      );
      server.listen(port, "127.0.0.1", () => server.close(resolve));
    });
  }
  start(
    path.join(root, "scr/server/dist/index.js"),
    path.join(root, "scr/server"),
    {
      PORT: "5107",
      MONGO_URI: "",
      JWT_SECRET: "test-secret-at-least-thirty-two-characters",
      GEMINI_API_KEY: "",
      PAYMENT_WEBHOOK_SECRET: "",
    },
  );
  await waitFor(base + "/health");
  check((await api("/health")).database === "demo", "demo health");
  const demo = await api("/products");
  check(demo.length === 36, "36 jewelry products across seven categories");
  check((await api("/products?search=Celeste")).length === 1, "demo search");
  await api("/products/not-real", { status: 404 });
  check(true, "missing product returns 404");
  await api("/auth/register", { method: "POST", body: {}, status: 503 });
  check(true, "database features fail fast in demo");
  check(
    new Set(demo.map((p) => p.category)).size === 7,
    "catalog includes anklets, charms and jewelry sets",
  );
  check(
    demo.some((p) => p.material === "Bạc 925" && p.price < 1000000) &&
      demo.some((p) => p.stone === "Ngọc trai") &&
      demo.some((p) => p.stone === "Ruby"),
    "catalog includes affordable silver, pearls and gemstones",
  );
  check(
    (await api("/products?search=ngoc%20trai")).length >= 4,
    "accent-insensitive jewelry search",
  );
  const anklets = await api(
    "/products?category=" + encodeURIComponent("Lắc chân"),
  );
  check(
    anklets.length === 2 && anklets.every((p) => p.category === "Lắc chân"),
    "new category API filter",
  );
  const silverReply = await api("/assistant", {
    method: "POST",
    body: { message: "Nhẫn bạc không kim cương dưới 1 triệu" },
  });
  check(
    silverReply.mode !== "diamond" &&
      silverReply.products.length > 0 &&
      silverReply.products.every(
        (p) =>
          p.material === "Bạc 925" &&
          p.stone !== "Kim cương" &&
          p.price <= 1000000,
      ),
    "AI recommends silver and understands no diamonds",
  );
  const pearlReply = await api("/assistant", {
    method: "POST",
    body: { message: "Bông tai ngọc trai dưới 1 triệu" },
  });
  check(
    pearlReply.products.length > 0 &&
      pearlReply.products.every(
        (p) =>
          p.category === "Bông tai" &&
          p.stone === "Ngọc trai" &&
          p.price <= 1000000,
      ),
    "AI recommends pearl earrings within budget",
  );
  const jewelryDiamond = await api("/assistant", {
    method: "POST",
    body: { message: "Nhẫn kim cương dưới 30 triệu" },
  });
  check(
    jewelryDiamond.mode !== "diamond" &&
      jewelryDiamond.products.length > 0 &&
      jewelryDiamond.products.every(
        (p) => p.category === "Nhẫn" && p.stone === "Kim cương",
      ),
    "diamond jewelry is routed to products rather than loose stones",
  );
  const ranked = await api("/diamonds/rank", {
    method: "POST",
    body: {
      budgetMax: 100000000,
      weights: { carat: 4, cut: 3, color: 2, clarity: 1 },
    },
  });
  check(
    ranked.length > 0 &&
      ranked.every((d) => d.price <= 100000000 && d.score <= 100),
    "demo DSS budget and normalized scores",
  );
  await api("/diamonds/rank", {
    method: "POST",
    body: { targetCarat: -1 },
    status: 400,
  });
  check(true, "DSS rejects invalid criteria");
  const reply = await api("/assistant", {
    method: "POST",
    body: { message: "Nhẫn cầu hôn dưới 30 triệu" },
  });
  check(
    reply.products.length > 0 &&
      reply.products.every((p) => p._id && p.images?.length),
    "assistant returns usable product cards",
  );
  const diamondReply = await api("/assistant", {
    method: "POST",
    body: { message: "kim cương dưới 100 triệu" },
  });
  check(
    diamondReply.diamonds.every((d) => d.price <= 100000000),
    "assistant respects diamond budget",
  );
  check(
    (await api("/recommendations/ml-status")).trained,
    "ML model resolves reliably",
  );
  await api("/assistant", {
    method: "POST",
    body: { message: "" },
    status: 400,
  });
  await api("/does-not-exist", { status: 404 });
  check(true, "invalid requests return JSON errors");
  await new Promise((resolve) => {
    children[0].once("exit", resolve);
    children[0].kill();
  });

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  start(
    path.join(root, "scr/server/dist/index.js"),
    path.join(root, "scr/server"),
    {
      PORT: "5107",
      MONGO_URI: mongo.getUri(),
      JWT_SECRET: "test-secret-at-least-thirty-two-characters",
      GEMINI_API_KEY: "",
      PAYMENT_WEBHOOK_SECRET: "test-payment-secret",
      BANK_NAME: "MIRA Test Bank",
      BANK_ACCOUNT_NO: "TEST-ACCOUNT",
      BANK_ACCOUNT_NAME: "MIRA TEST",
    },
  );
  await waitFor(base + "/health", (body) => body.database === "mongodb");
  const credentials = {
    name: "Test Customer",
    email: "buyer@example.com",
    password: "Test123456",
  };
  await api("/auth/register", {
    method: "POST",
    body: { ...credentials, password: "123" },
    status: 400,
  });
  const registered = await api("/auth/register", {
    method: "POST",
    body: credentials,
    status: 201,
  });
  await api("/auth/register", {
    method: "POST",
    body: credentials,
    status: 409,
  });
  await api("/auth/login", {
    method: "POST",
    body: { ...credentials, password: "incorrect" },
    status: 401,
  });
  const login = await api("/auth/login", {
    method: "POST",
    body: { email: " BUYER@EXAMPLE.COM ", password: credentials.password },
  });
  const token = login.token;
  check(
    login.user.role === "customer" && registered.token,
    "registration, duplicate and login validation",
  );
  await api("/auth/me", { status: 401 });
  await api("/auth/me", {
    method: "PATCH",
    token,
    body: { name: "Updated Customer", phone: "0901234567", role: "admin" },
  });
  const profile = await api("/auth/me", { token });
  check(
    profile.name === "Updated Customer" &&
      profile.role === "customer" &&
      !profile.password,
    "profile persists without role escalation",
  );
  await api("/products", { method: "POST", token, body: {}, status: 403 });
  await mongoose.connection
    .collection("users")
    .updateOne({ email: credentials.email }, { $set: { role: "admin" } });
  const adminLogin = await api("/auth/login", {
    method: "POST",
    body: credentials,
  });
  const admin = adminLogin.token;
  await api("/products", {
    method: "POST",
    token: admin,
    body: { name: "Invalid", price: -1 },
    status: 400,
  });
  const product = await api("/products", {
    method: "POST",
    token: admin,
    body: {
      name: "Test Ring",
      slug: "test-ring",
      featured: true,
      engravingAllowed: true,
      stone: "Không đính đá",
      category: "Nhẫn",
      material: "Vàng Trắng 18K",
      price: 20000000,
      salePrice: 18000000,
      stock: 10,
      sizes: ["12"],
      images: [demo[0].images[0]],
    },
    status: 201,
  });
  check(
    (await api("/products?search=Test")).length === 1,
    "admin product creation and database search",
  );
  await api("/products/" + product._id, {
    method: "PUT",
    token: admin,
    body: { price: -1 },
    status: 400,
  });
  check(true, "product update validates price");
  const body = {
    customer,
    items: [
      {
        product: product._id,
        quantity: 2,
        size: "12",
        price: 1,
        engraving: "MIRA",
      },
    ],
    subtotal: 1,
    total: 1,
    paymentMethod: "COD",
  };
  await api("/orders", { method: "POST", body, status: 401 });
  await api("/orders", {
    method: "POST",
    body: { ...body, items: [] },
    token,
    status: 400,
  });
  await api("/orders", {
    method: "POST",
    body: { ...body, items: [{ product: product._id, quantity: -1 }] },
    token,
    status: 400,
  });
  await api("/orders", {
    method: "POST",
    body: {
      ...body,
      items: [{ product: product._id, quantity: 11, size: "12" }],
    },
    token,
    status: 409,
  });
  await api("/orders", {
    method: "POST",
    body: {
      ...body,
      items: [{ product: product._id, quantity: 1, size: "99" }],
    },
    token,
    status: 400,
  });
  const order = await api("/orders", {
    method: "POST",
    body,
    token,
    status: 201,
  });
  check(
    order.total === 36000000 &&
      order.items[0].price === 18000000 &&
      order.items[0].engraving === "MIRA",
    "server computes order price and preserves selection",
  );
  check(
    (await api("/products/test-ring")).stock === 8,
    "order reserves inventory",
  );
  const cancelOrder = await api("/orders", {
    method: "POST",
    body: {
      ...body,
      items: [{ product: product._id, quantity: 1, size: "12" }],
    },
    token,
    status: 201,
  });
  await api("/orders/" + cancelOrder._id + "/status", {
    method: "PATCH",
    token: admin,
    body: { status: "cancelled" },
  });
  check(
    (await api("/products/test-ring")).stock === 8,
    "cancellation restores inventory",
  );
  await api("/orders/" + cancelOrder._id + "/status", {
    method: "PATCH",
    token: admin,
    body: { status: "cancelled" },
    status: 400,
  });
  check(
    (await api("/orders/mine", { token })).length === 2,
    "customer sees own orders",
  );
  await api("/orders/" + order._id + "/status", {
    method: "PATCH",
    token,
    body: { status: "completed" },
    status: 403,
  });
  await api("/orders/" + order._id + "/status", {
    method: "PATCH",
    token: admin,
    body: { status: "completed" },
    status: 400,
  });
  await api("/orders/" + order._id + "/status", {
    method: "PATCH",
    token: admin,
    body: { status: "confirmed" },
  });
  check(true, "order permissions and valid transitions");
  await api("/payments/create/" + order._id, {
    method: "POST",
    token,
    status: 409,
  });
  const qrOrder = await api("/orders", {
    method: "POST",
    body: { ...body, paymentMethod: "BANK_QR" },
    token,
    status: 201,
  });
  const payment = await api("/payments/create/" + qrOrder._id, {
    method: "POST",
    token,
  });
  check(payment.amount === qrOrder.total, "QR uses server order total");
  const webhook = {
    transactionId: "test-transfer-1",
    amount: qrOrder.total,
    content: qrOrder.orderCode,
    bankCode: "TEST",
  };
  await api("/payments/webhook", {
    method: "POST",
    body: webhook,
    status: 401,
  });
  await api("/payments/webhook", {
    method: "POST",
    body: webhook,
    headers: { "x-webhook-signature": sign(webhook) },
  });
  const duplicate = await api("/payments/webhook", {
    method: "POST",
    body: webhook,
    headers: { "x-webhook-signature": sign(webhook) },
  });
  check(
    duplicate.duplicate &&
      (await api("/payments/order/" + qrOrder._id, { token })).paymentStatus ===
        "PAID",
    "signed webhook and duplicate handling",
  );
  await api("/payments/create/" + qrOrder._id, {
    method: "POST",
    token,
    status: 409,
  });
  check(true, "paid order cannot be reset");
  await api("/behaviors", {
    method: "POST",
    token,
    body: { type: "VIEW", product: product._id },
    status: 201,
  });
  const recommendations = await api("/recommendations", { token });
  check(
    recommendations.products.length > 0 && recommendations.recommendationId,
    "behavior and personalized recommendations",
  );
  await api(
    "/recommendations/" + recommendations.recommendationId + "/feedback",
    { method: "POST", token, body: { clickedProduct: product._id } },
  );
  const other = await api("/auth/register", {
    method: "POST",
    body: { ...credentials, email: "other@example.com" },
    status: 201,
  });
  await api(
    "/recommendations/" + recommendations.recommendationId + "/feedback",
    {
      method: "POST",
      token: other.token,
      body: { purchased: true },
      status: 404,
    },
  );
  await api("/payments/order/" + qrOrder._id, {
    token: other.token,
    status: 404,
  });
  check(
    (await api("/orders/mine", { token: other.token })).length === 0,
    "customer data isolation",
  );
  check(
    (await api("/analytics", { token: admin })).paidOrders === 1 &&
      (await api("/audit", { token: admin })).length > 0,
    "analytics and audit records",
  );
  await api("/products/not-an-id", {
    method: "PUT",
    token: admin,
    body: { price: 1 },
    status: 400,
  });
  check(
    (await api("/health")).ok,
    "malformed database IDs do not crash server",
  );

  for (let run = 0; run < 2; run++) {
    const importer = start(
      path.join(root, "node_modules/tsx/dist/cli.mjs"),
      path.join(root, "scr/server"),
      { MONGO_URI: mongo.getUri() },
      ["src/scripts/seed-catalog.ts"],
    );
    await new Promise((resolve, reject) => {
      importer.once("error", reject);
      importer.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("catalog import failed")),
      );
    });
  }
  check(
    (await api("/products/test-ring")).stock === 6,
    "additive catalog import is repeatable and preserves existing stock",
  );
  check((await api("/products")).length === 37, "catalog test fixtures loaded");
  const silverProduct = await api("/products/day-chuyen-bac-starlight");
  const silverOrder = await api("/orders", {
    method: "POST",
    token: other.token,
    status: 201,
    body: {
      customer,
      paymentMethod: "COD",
      items: [
        { product: silverProduct._id, quantity: 1, size: "40cm", price: 1 },
      ],
      total: 1,
    },
  });
  check(
    silverOrder.subtotal === 590000 &&
      silverOrder.shippingFee === 30000 &&
      silverOrder.total === 620000,
    "affordable jewelry has correct server price and delivery fee",
  );
  await api(`/orders/${silverOrder._id}/cancel`, {
    method: "PATCH",
    token,
    status: 404,
  });
  await api(`/orders/${silverOrder._id}/cancel`, {
    method: "PATCH",
    token: other.token,
  });
  check(
    (await api("/products/day-chuyen-bac-starlight")).stock ===
      silverProduct.stock,
    "customer cancellation restores inventory and respects ownership",
  );
  await api(`/orders/${silverOrder._id}/cancel`, {
    method: "PATCH",
    token: other.token,
    status: 400,
  });
  const vite = start(
    path.join(root, "node_modules/vite/bin/vite.js"),
    path.join(root, "scr/client"),
    { API_PROXY_TARGET: "http://127.0.0.1:5107" },
    ["--host", "127.0.0.1", "--port", "5187", "--strictPort"],
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5187")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({
    channel: process.env.TEST_BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const illustrations = demo.filter((p) => p.image.startsWith("/products/"));
  const assets = await Promise.all(
    illustrations.map((p) => fetch("http://127.0.0.1:5187" + p.image)),
  );
  check(
    illustrations.length === 20 &&
      assets.every(
        (response) =>
          response.ok &&
          response.headers.get("content-type")?.includes("image/svg+xml"),
      ),
    "20 jewelry illustrations load from local assets",
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5187/products");
  await expect(
    page.getByRole("heading", { name: "Tất Cả Sản Phẩm", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".shop-card")).toHaveCount(8);
  check(true, "dedicated Products page opens the full jewelry catalog");
  await expect(page.locator(".filters .filter-block > b")).toHaveText([
    "DANH MỤC",
    "CHẤT LIỆU KIM LOẠI",
    "LOẠI ĐÁ / ĐIỂM NHẤN",
    "NGÂN SÁCH TỐI ĐA",
  ]);
  await expect(page.locator(".shape-section")).toHaveCount(0);
  await expect(page.getByRole("slider")).toHaveCount(1);
  check(
    true,
    "catalog displays exactly the four requested filter groups without cuts",
  );
  await page.getByRole("checkbox", { name: "Bạc 925", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Bạc 925", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("slider", { name: "Ngân sách tối đa", exact: true })
    .evaluate((input) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(input, "1000000");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await page.waitForURL(
    (url) => url.searchParams.get("maxPrice") === "1000000",
  );
  await expect(page.locator(".shop-card")).toHaveCount(8);
  await expect(page.locator(".shop-intro > div > b")).toHaveText("9");
  check(
    true,
    "maximum budget combines with material to show nine affordable silver products",
  );
  await page.getByRole("checkbox", { name: "Nhẫn", exact: true }).click();
  await expect(page.locator(".shop-card")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Tất Cả Sản Phẩm", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".shop-card")).toHaveCount(2);
  check(
    true,
    "category, material and maximum budget combine and persist on reload",
  );
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.locator(".active-filters")).toHaveCount(0);
  await expect(page.locator(".shop-card")).toHaveCount(8);
  check(true, "reset clears all catalog filters");
  await page.getByRole("checkbox", { name: "Bạc 925", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Bạc 925", exact: true }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "Vàng 14K", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Bạc 925", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Vàng 14K", exact: true }),
  ).toBeChecked();
  check(
    new URL(page.url()).searchParams.getAll("material").length === 2,
    "material checkboxes allow multiple selections",
  );
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.locator(".active-filters")).toHaveCount(0);
  await page
    .locator(".lux-nav")
    .getByRole("link", { name: "SẢN PHẨM", exact: true })
    .click();
  await expect(page.locator(".shop-card")).toHaveCount(8);
  check(
    new URL(page.url()).pathname === "/products",
    "header Products link opens the full catalog",
  );
  await fs.mkdir(path.join(root, "scr/test-data/results"), { recursive: true });
  await page.screenshot({
    path: path.join(root, "scr/test-data/results/products-desktop.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:5187/shop");
  await page.locator(".shop-card").first().waitFor();
  check(true, "browser shop loads through Vite API proxy");
  await page.locator("#catalog-search").fill("Celeste");
  await page
    .getByRole("heading", { name: "Nhẫn Celeste", exact: true })
    .waitFor();
  check(
    (await page.locator(".shop-card").count()) === 1,
    "browser catalog search",
  );
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  check(
    new URL(page.url()).searchParams.get("page") === "2",
    "browser pagination",
  );
  await page.goto("http://127.0.0.1:5187/shop?category=Bông%20tai");
  await page
    .getByRole("heading", { name: "Bông tai Pearl", exact: true })
    .waitFor();
  check(
    (await page.locator(".shop-card").count()) === 7,
    "browser category URL filter",
  );
  await page.goto("http://127.0.0.1:5187/shop?search=Test%20Ring");
  await page.getByRole("heading", { name: "Test Ring", exact: true }).waitFor();
  await page.getByRole("button", { name: "Yêu thích Test Ring" }).click();
  await page.goto("http://127.0.0.1:5187/wishlist");
  await page.getByRole("heading", { name: "Test Ring", exact: true }).waitFor();
  check(true, "wishlist saves and renders products");
  await page.goto("http://127.0.0.1:5187/product/test-ring");
  await page.getByRole("heading", { name: "Test Ring", exact: true }).waitFor();
  await page.locator(".pd-engraving input").fill("Browser test");
  await page.getByRole("button", { name: "MUA NGAY BẰNG 1 CHẠM" }).click();
  await page.getByRole("heading", { name: "Giỏ Hàng Của Bạn" }).waitFor();
  check(
    (await page.getByText("Browser test", { exact: false }).count()) > 0,
    "browser product selection reaches cart",
  );
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("mira_token", token);
      localStorage.setItem("mira_user", JSON.stringify(user));
    },
    { token, user: login.user },
  );
  await page.goto("http://127.0.0.1:5187/checkout");
  await page.getByLabel("HỌ VÀ TÊN", { exact: true }).fill(customer.name);
  await page.getByLabel("SỐ ĐIỆN THOẠI", { exact: true }).fill(customer.phone);
  await page.getByLabel("EMAIL", { exact: true }).fill(customer.email);
  await page
    .getByLabel("ĐỊA CHỈ BÀN GIAO", { exact: true })
    .fill(customer.address);
  await page.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await page.waitForURL("**/account");
  check(
    (await api("/orders/mine", { token })).length === 4,
    "browser checkout creates order and navigates to account",
  );
  await page.goto("http://127.0.0.1:5187/shop?collection=bac");
  await page
    .getByRole("heading", { name: "Trang Sức Bạc", exact: true })
    .waitFor();
  await page.locator(".shop-card").first().waitFor();
  check(true, "silver jewelry collection opens");
  await page.getByRole("checkbox", { name: "Ngọc trai", exact: true }).click();
  await page
    .getByRole("heading", { name: "Dây chuyền ngọc trai Clair", exact: true })
    .waitFor();
  await expect(page.locator(".shop-card")).toHaveCount(4);
  check(true, "stone and collection filters combine");
  await page
    .getByRole("combobox", { name: "Sắp xếp" })
    .selectOption("price-asc");
  await expect(page.locator(".shop-card h3").first()).toHaveText(
    "Bông tai ngọc trai Nacre",
  );
  const firstCard = await page.locator(".shop-card h3").first().textContent();
  check(
    firstCard === "Bông tai ngọc trai Nacre",
    "price sorting works on pearl jewelry",
  );
  await page.goto("http://127.0.0.1:5187/product/bong-tai-ngoc-trai-nacre");
  await page
    .getByRole("heading", { name: "Bông tai ngọc trai Nacre", exact: true })
    .waitFor();
  await page.locator(".pd-main-image img").evaluate((img) => img.decode());
  check(
    (await page.locator(".pd-main-image img").getAttribute("src")) ===
      "/products/bong-tai-ngoc-trai-nacre.svg",
    "pearl earrings use their own illustration rather than a diamond ring photo",
  );
  check(
    (await page
      .locator(".product-specs")
      .getByText("Bạc 925", { exact: true })
      .count()) === 1 && (await page.locator(".pd-engraving").count()) === 0,
    "pearl earrings show silver material and no ring engraving",
  );
  await page.getByRole("button", { name: "MUA NGAY BẰNG 1 CHẠM" }).click();
  await page
    .getByRole("heading", { name: "Giỏ Hàng Của Bạn", exact: true })
    .waitFor();
  await page.evaluate(() => {
    localStorage.removeItem("mira_token");
    localStorage.removeItem("mira_user");
  });
  await page.goto("http://127.0.0.1:5187/checkout");
  await page.getByRole("link", { name: "ĐĂNG NHẬP", exact: true }).click();
  await page.locator(".auth-form input[type=email]").fill("other@example.com");
  await page
    .locator(".auth-form input[type=password]")
    .fill(credentials.password);
  await page.getByRole("button", { name: "ĐĂNG NHẬP", exact: true }).click();
  await page.waitForURL("**/checkout");
  await expect(page.locator(".checkout-mini")).toHaveCount(1);
  check(true, "login returns to checkout with pearl item preserved");
  await page.getByLabel("HỌ VÀ TÊN", { exact: true }).fill(customer.name);
  await page.getByLabel("SỐ ĐIỆN THOẠI", { exact: true }).fill(customer.phone);
  await page.getByLabel("EMAIL", { exact: true }).fill(customer.email);
  await page
    .getByLabel("ĐỊA CHỈ BÀN GIAO", { exact: true })
    .fill(customer.address);
  await page.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await page.waitForURL("**/account");
  check(
    (await api("/orders/mine", { token: other.token })).some((o) =>
      o.items.some((i) => i.name === "Bông tai ngọc trai Nacre"),
    ),
    "browser purchases pearl jewelry after login",
  );
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("mira_token", token);
      localStorage.setItem("mira_user", JSON.stringify(user));
    },
    { token, user: login.user },
  );
  const resumeOrder = await api("/orders", {
    method: "POST",
    body: {
      ...body,
      paymentMethod: "BANK_QR",
      items: [{ product: product._id, quantity: 1, size: "12" }],
    },
    token,
    status: 201,
  });
  await page.goto(`http://127.0.0.1:5187/checkout?order=${resumeOrder._id}`);
  await page
    .getByRole("heading", { name: `Thanh toán đơn ${resumeOrder.orderCode}` })
    .waitFor();
  check(true, "pending bank payment can be resumed with empty cart");
  for (const route of [
    "/",
    "/shop?category=Nhẫn",
    "/products",
    "/login",
    "/register",
    "/advisor",
    "/for-you",
    "/diamond-dss",
    "/about",
    "/admin",
    "/missing",
    "/product/does-not-exist",
  ]) {
    await page.goto("http://127.0.0.1:5187" + route);
    await page.locator("h1:visible,h2:visible").first().waitFor();
  }
  check(
    errors.length === 0,
    `route smoke test without JavaScript errors: ${errors.join(", ")}`,
  );
  await fs.mkdir(path.join(root, "scr/test-data/results"), { recursive: true });
  await page.goto("http://127.0.0.1:5187/shop");
  await page.locator(".shop-card").first().waitFor();
  await page.screenshot({
    path: path.join(root, "scr/test-data/results/shop-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator(".shop-card").first().waitFor();
  await page.screenshot({
    path: path.join(root, "scr/test-data/results/shop-mobile.png"),
    fullPage: true,
  });
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 10)
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        width: e.getBoundingClientRect().width,
      })),
  }));
  check(
    overflow.scroll <= overflow.width,
    `mobile shop has no horizontal overflow: ${JSON.stringify(overflow)}`,
  );
  for (const route of [
    "/",
    "/product/test-ring",
    "/product/charm-bac-co-bon-la",
    "/products",
    "/shop?collection=ngoc-trai",
    "/cart",
    "/checkout",
    "/account",
    "/login",
    "/advisor",
    "/diamond-dss",
  ]) {
    await page.goto("http://127.0.0.1:5187" + route);
    await page.locator("h1:visible,h2:visible").first().waitFor();
    await page.waitForTimeout(150);
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }));
    check(
      widths.scroll <= widths.width,
      `mobile ${route} fits viewport: ${JSON.stringify(widths)}`,
    );
  }
  await page.evaluate(() => {
    localStorage.setItem("mira_cart", "broken");
    localStorage.setItem("mira_user", "broken");
  });
  await page.goto("http://127.0.0.1:5187/cart");
  await page
    .getByRole("heading", { name: "Giỏ hàng đang trống", exact: true })
    .waitFor();
  check(true, "corrupt cart storage recovers");
  const reviewPath = "/products/test-ring/reviews";
  const reviewBody = { rating: 5, comment: "Thiết kế đẹp, đeo thoải mái." };
  check(
    (await api(reviewPath)).total === 0,
    "public can read empty product reviews",
  );
  await api(reviewPath, { method: "POST", body: reviewBody, status: 401 });
  await api(reviewPath, {
    method: "POST",
    token: other.token,
    body: { ...reviewBody, user: login.user._id, order: order._id },
    status: 403,
  });
  await api(reviewPath, {
    method: "POST",
    token,
    body: reviewBody,
    status: 403,
  });
  check(
    !(await api(reviewPath, { token })).canReview,
    "pending, paid but uncompleted and cancelled purchases do not unlock reviews",
  );
  await api("/orders/" + order._id + "/status", {
    method: "PATCH",
    token: admin,
    body: { status: "shipping" },
  });
  await api(reviewPath, {
    method: "POST",
    token,
    body: reviewBody,
    status: 403,
  });
  await api("/orders/" + order._id + "/status", {
    method: "PATCH",
    token: admin,
    body: { status: "completed" },
  });
  check(
    (await api(reviewPath, { token })).canReview,
    "only completed purchase of the exact product unlocks reviews",
  );
  const pearlPath = "/products/bong-tai-ngoc-trai-nacre/reviews";
  await api(pearlPath, {
    method: "POST",
    token,
    body: reviewBody,
    status: 403,
  });
  await api("/products/no-such-product/reviews", { status: 404 });
  for (const invalid of [
    { rating: 0, comment: "a" },
    { rating: 6, comment: "a" },
    { rating: 3.5, comment: "a" },
    { rating: "5", comment: "a" },
    { rating: 5, comment: "   " },
    { rating: 5, comment: "a".repeat(2001) },
  ])
    await api(reviewPath, {
      method: "POST",
      token,
      body: invalid,
      status: 400,
    });
  check(
    true,
    "review validates rating and comment and blocks reviews for unpurchased products",
  );
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("mira_token", token);
      localStorage.setItem("mira_user", JSON.stringify(user));
    },
    { token, user: login.user },
  );
  await page.goto("http://127.0.0.1:5187/product/test-ring");
  await expect(
    page.getByRole("button", { name: "Gửi đánh giá", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "5 sao", exact: true }).check();
  await page
    .getByLabel("Nội dung đánh giá", { exact: true })
    .fill(reviewBody.comment);
  await page.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
  await expect(page.locator(".review-item")).toHaveCount(1);
  await expect(page.locator(".review-comment")).toHaveText(reviewBody.comment);
  await expect(
    page.getByRole("button", { name: "Gửi đánh giá", exact: true }),
  ).toHaveCount(0);
  check(
    true,
    "verified buyer submits review in browser and cannot submit a second review",
  );
  await api(reviewPath, {
    method: "POST",
    token,
    body: reviewBody,
    status: 409,
  });
  const publicReviews = await api(reviewPath);
  check(
    publicReviews.total === 1 &&
      publicReviews.average === 5 &&
      !publicReviews.canReview &&
      !publicReviews.reviews[0].user &&
      !publicReviews.reviews[0].order &&
      !publicReviews.reviews[0].email,
    "review average is real and public response hides private account/order data",
  );
  await page.reload();
  await expect(page.locator(".review-item")).toHaveCount(1);
  await expect(page.locator(".review-form")).toHaveCount(0);
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("mira_token", token);
      localStorage.setItem("mira_user", JSON.stringify(user));
    },
    { token: other.token, user: other.user },
  );
  await page.reload();
  await expect(page.locator(".review-item")).toHaveCount(1);
  await expect(page.locator(".review-eligibility")).toContainText(
    "đơn hàng chứa sản phẩm này đã hoàn tất",
  );
  await expect(page.locator(".review-form")).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.removeItem("mira_token");
    localStorage.removeItem("mira_user");
  });
  await page.reload();
  await expect(page.locator(".review-item")).toHaveCount(1);
  await expect(page.locator(".review-eligibility a")).toHaveText("Đăng nhập");
  await expect(page.locator(".review-form")).toHaveCount(0);
  check(
    true,
    "non-buyers and guests can read existing reviews but never see the review form",
  );
  await page.screenshot({
    path: path.join(root, "scr/test-data/results/reviews-mobile.png"),
    fullPage: true,
  });
  // A second verified buyer exercises the unique index under concurrent requests.
  const otherUser = await mongoose.connection
    .collection("users")
    .findOne({ email: "other@example.com" });
  const otherOrder = await mongoose.connection.collection("orders").insertOne({
    user: otherUser._id,
    items: [{ product: new mongoose.Types.ObjectId(product._id) }],
    status: "completed",
    paymentStatus: "REFUNDED",
    orderCode: "REVIEW-FIXTURE",
  });
  await api(reviewPath, {
    method: "POST",
    token: other.token,
    body: reviewBody,
    status: 403,
  });
  await mongoose.connection
    .collection("orders")
    .updateOne(
      { _id: otherOrder.insertedId },
      { $set: { paymentStatus: "PAID" } },
    );
  const concurrentReviews = await Promise.all(
    [1, 2].map(() =>
      fetch(base + reviewPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${other.token}`,
        },
        body: JSON.stringify({ rating: 4, comment: "Chất liệu đẹp." }),
      }),
    ),
  );
  check(
    concurrentReviews
      .map((response) => response.status)
      .sort()
      .join(",") === "201,409" && (await api(reviewPath)).average === 4.5,
    "refunded purchase is rejected and concurrent submissions cannot duplicate a review",
  );
  check(errors.length === 0, "review browser flows have no JavaScript errors");
  await fs.writeFile(
    path.join(root, "scr/test-data/results/summary.json"),
    JSON.stringify(
      {
        checks,
        passed: true,
        scope: "Demo APIs, isolated MongoDB integration and Chrome browser",
        screenshots: ["shop-desktop.png", "shop-mobile.png"],
      },
      null,
      2,
    ),
  );
  console.log(`\n${checks} checks passed.`);
} catch (error) {
  console.error(error);
  console.error(logs.slice(-10).join(""));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await Promise.all(
    children
      .filter((child) => child.exitCode === null && child.signalCode === null)
      .map(
        (child) =>
          new Promise((resolve) => {
            child.once("exit", resolve);
            child.kill();
          }),
      ),
  );
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}
