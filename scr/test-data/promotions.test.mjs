import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";

process.env.JWT_SECRET = "isolated-promotion-test-secret-32-characters";
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri());
const { default: app } = await import("../server/dist/app.js");
const { default: Promotion } =
  await import("../server/dist/models/Promotion.js");
const { default: Product } = await import("../server/dist/models/Product.js");
const { default: User } = await import("../server/dist/models/User.js");
const { default: Order } = await import("../server/dist/models/Order.js");
await Promise.all([Promotion.init(), Product.init(), User.init()]);
const adminUser = await User.create({
  name: "Promotion Admin",
  email: "promotion-admin@example.com",
  password: "unused-fixture",
  role: "admin",
});
const customerUser = await User.create({
  name: "Promotion Buyer",
  email: "promotion-buyer@example.com",
  password: "unused-fixture",
  role: "customer",
});
const sign = (user) =>
  jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET);
const admin = sign(adminUser),
  customerToken = sign(customerUser);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log("PASS", label);
};
async function api(path, { method = "GET", body, token, status = 200 } = {}) {
  const response = await fetch(base + "/api" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return data;
}
const started = new Date(Date.now() - 60000).toISOString(),
  ends = new Date(Date.now() + 86400000).toISOString();
const offer = (overrides) => ({
  name: "Ưu đãi kiểm thử",
  type: "voucher",
  code: "MIRA10",
  discountType: "percent",
  value: 10,
  minSubtotal: 500000,
  maxDiscount: 50000,
  allProducts: true,
  productIds: [],
  startsAt: started,
  endsAt: ends,
  active: true,
  ...overrides,
});
try {
  const ring = await Product.create({
    name: "Nhẫn khuyến mãi",
    slug: "promotion-ring",
    category: "Nhẫn",
    material: "Bạc 925",
    price: 1000000,
    salePrice: 900000,
    stock: 20,
    sizes: ["12"],
    images: ["/products/nhan-bac-flora.svg"],
  });
  const pearl = await Product.create({
    name: "Dây chuyền nguyên giá",
    slug: "promotion-pearl",
    category: "Dây chuyền",
    material: "Bạc 925",
    price: 500000,
    stock: 20,
    sizes: ["Tiêu chuẩn"],
    images: ["/placeholder.svg"],
  });
  await api("/promotions", { status: 401 });
  await api("/promotions", {
    method: "POST",
    token: customerToken,
    body: offer({}),
    status: 403,
  });
  await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({ value: 101 }),
    status: 400,
  });
  await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({ endsAt: started }),
    status: 400,
  });
  await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({ startsAt: { toString: 1, valueOf: 2 } }),
    status: 400,
  });
  await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({ type: "discount", allProducts: false, productIds: [] }),
    status: 400,
  });
  const voucher = await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({ code: "mira10" }),
    status: 201,
  });
  await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({}),
    status: 409,
  });
  check(
    voucher.code === "MIRA10",
    "voucher authorization, normalized unique codes and validation",
  );
  const discount = await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({
      name: "Giảm 20%",
      type: "discount",
      value: 20,
      maxDiscount: 0,
      allProducts: false,
      productIds: [String(ring._id)],
    }),
    status: 201,
  });
  const flash = await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({
      name: "Flash 40%",
      type: "flash_sale",
      value: 40,
      maxDiscount: 0,
      allProducts: false,
      productIds: [String(ring._id)],
    }),
    status: 201,
  });
  await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({
      name: "Future flash",
      type: "flash_sale",
      value: 100,
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      maxDiscount: 0,
    }),
    status: 201,
  });
  let listing = await api("/products");
  const promoted = listing.find((p) => p.slug === "promotion-ring");
  check(
    promoted.salePrice === 600000 &&
      promoted.promotion.type === "flash_sale" &&
      !listing.find((p) => p.slug === "promotion-pearl").promotion,
    "best active product price wins without stacking; future and unrelated promotions excluded",
  );
  check(
    (await api("/products/promotion-ring")).salePrice === 600000,
    "catalog and product detail use the same live promotion price",
  );
  const items = [
    { product: String(ring._id), quantity: 1, size: "12", price: 1 },
  ];
  const quote = await api("/promotions/quote", {
    method: "POST",
    body: { items, voucherCode: " mira10 ", subtotal: 1, total: 1 },
  });
  check(
    quote.subtotal === 600000 &&
      quote.discountTotal === 50000 &&
      quote.total === 580000 &&
      quote.shippingFee === 30000,
    "server ignores forged totals, caps voucher and computes shipping after automatic price reduction",
  );
  const buyer = {
    name: "Promotion Buyer",
    email: "promotion-buyer@example.com",
    phone: "0901234567",
    provinceCode: "79",
    wardCode: "25747",
    addressLine: "12 Nguyễn Huệ",
  };
  await api("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      items,
      customer: buyer,
      paymentMethod: "COD",
      voucherCode: "MIRA10",
      quotedTotal: 500000,
    },
    status: 409,
  });
  check(
    (await Order.countDocuments()) === 0 &&
      (await Product.findById(ring._id)).stock === 20,
    "changed checkout quote requires confirmation before an order or inventory reservation",
  );
  const order = await api("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      items,
      customer: buyer,
      paymentMethod: "COD",
      voucherCode: "MIRA10",
      total: 1,
      discountTotal: 9999999,
    },
    status: 201,
  });
  const stored = await Order.findById(order._id).lean();
  check(
    stored.total === 580000 &&
      stored.discountTotal === 50000 &&
      stored.voucher.code === "MIRA10" &&
      stored.items[0].price === 600000 &&
      stored.items[0].promotion.name === "Flash 40%",
    "orders persist authoritative final prices, voucher and campaign snapshots",
  );
  await api(`/promotions/${flash._id}/active`, {
    method: "PATCH",
    token: admin,
    body: { active: false },
  });
  check(
    (await api("/products/promotion-ring")).salePrice === 800000,
    "disabling flash sale reveals the next eligible product discount",
  );
  await api(`/promotions/${discount._id}`, {
    method: "PUT",
    token: admin,
    body: offer({
      type: "discount",
      name: "Ended",
      value: 20,
      maxDiscount: 0,
      allProducts: false,
      productIds: [String(ring._id)],
      startsAt: new Date(Date.now() - 120000).toISOString(),
      endsAt: new Date(Date.now() - 60000).toISOString(),
    }),
  });
  check(
    (await api("/products/promotion-ring")).salePrice === 900000,
    "expired campaign ends automatically and existing product sale price survives",
  );
  const minimum = await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({ code: "MINIMUM", minSubtotal: 2000000 }),
    status: 201,
  });
  await api("/promotions/quote", {
    method: "POST",
    body: { items, voucherCode: minimum.code },
    status: 400,
  });
  await api("/promotions/quote", {
    method: "POST",
    body: { items, voucherCode: { $ne: null } },
    status: 400,
  });
  await api("/promotions/quote", {
    method: "POST",
    body: { items: [items[0], { ...items[0], quantity: 20 }] },
    status: 409,
  });
  await api(`/promotions/${voucher._id}/active`, {
    method: "PATCH",
    token: admin,
    body: { active: false },
  });
  const stockBefore = (await Product.findById(ring._id)).stock;
  await api("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      items,
      customer: buyer,
      paymentMethod: "COD",
      voucherCode: "MIRA10",
    },
    status: 400,
  });
  check(
    (await Product.findById(ring._id)).stock === stockBefore,
    "minimum spend, invalid code and duplicate stock validation; disabled voucher cannot reserve stock",
  );
  await api(`/promotions/${voucher._id}/active`, {
    method: "PATCH",
    token: admin,
    body: { active: true },
  });
  await api(`/promotions/${flash._id}/active`, {
    method: "PATCH",
    token: admin,
    body: { active: true },
  });
  const fixed = await api("/promotions", {
    method: "POST",
    token: admin,
    body: offer({
      code: "FIXED",
      discountType: "amount",
      value: 2000000,
      maxDiscount: 0,
      minSubtotal: 0,
    }),
    status: 201,
  });
  check(
    (
      await api("/promotions/quote", {
        method: "POST",
        body: { items, voucherCode: fixed.code },
      })
    ).total === 30000,
    "fixed discounts cannot exceed merchandise subtotal or reduce shipping",
  );
  check(
    (await Product.findById(ring._id)).salePrice === 900000,
    "scheduled campaigns never rewrite the original product price",
  );

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  const setup = async (target, user, cart = null) => {
    target.on("pageerror", (e) => errors.push(e.message));
    await target.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: base + url.pathname + url.search,
      });
      await route.fulfill({ response });
    });
    await target.addInitScript(
      ({ token, user, cart }) => {
        localStorage.setItem("mira_token", token);
        localStorage.setItem("mira_user", JSON.stringify(user));
        if (cart) localStorage.setItem("mira_cart", JSON.stringify(cart));
      },
      {
        token: sign(user),
        user: {
          id: String(user._id),
          role: user.role,
          name: user.name,
          email: user.email,
        },
        cart,
      },
    );
  };
  const web = process.env.UI_TEST_URL || "http://127.0.0.1:5173";
  await setup(page, adminUser);
  await page.goto(web + "/admin");
  await page.getByRole("button", { name: "Khuyến mãi", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Thêm voucher", exact: true })
    .click();
  await page
    .getByLabel("Tên chương trình", { exact: true })
    .fill("Voucher từ trình duyệt");
  await page.getByLabel("Mã voucher", { exact: true }).fill("BROWSER10");
  await page
    .getByRole("button", { name: "Lưu khuyến mãi", exact: true })
    .click();
  const card = page.locator(".promotion-card").filter({ hasText: "BROWSER10" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Sửa", exact: true }).click();
  await page
    .getByLabel("Tên chương trình", { exact: true })
    .fill("Voucher đã cập nhật");
  await page
    .getByRole("button", { name: "Lưu khuyến mãi", exact: true })
    .click();
  await expect(card).toContainText("Voucher đã cập nhật");
  await card
    .getByRole("button", { name: "Tắt chương trình", exact: true })
    .click();
  await expect(card).toContainText("Đã tắt");
  check(
    (await Promotion.findOne({ code: "BROWSER10" })).active === false,
    "admin creates, edits and disables vouchers in browser against isolated MongoDB",
  );
  await page.getByRole("button", { name: /^Flash sale / }).click();
  await page
    .getByRole("button", { name: "+ Thêm flash sale", exact: true })
    .click();
  await page
    .getByLabel("Tên chương trình", { exact: true })
    .fill("Flash sale từ trình duyệt");
  await page
    .getByRole("checkbox", { name: "Nhẫn khuyến mãi", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Lưu khuyến mãi", exact: true })
    .click();
  await expect(
    page
      .locator(".promotion-card")
      .filter({ hasText: "Flash sale từ trình duyệt" }),
  ).toBeVisible();
  await fs.mkdir("scr/test-data/results", { recursive: true });
  await page.screenshot({
    path: "scr/test-data/results/admin-promotions-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "promotion administration fits mobile viewport",
  );
  await page.screenshot({
    path: "scr/test-data/results/admin-promotions-mobile.png",
    fullPage: true,
  });

  const checkout = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await setup(checkout, customerUser, [
    {
      _id: String(ring._id),
      slug: ring.slug,
      name: ring.name,
      price: 1000000,
      quantity: 1,
      size: "12",
      stock: 19,
      image: ring.images[0],
    },
  ]);
  await checkout.goto(web + "/cart");
  await checkout.getByLabel("Mã ưu đãi", { exact: true }).fill("MIRA10");
  await checkout.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(checkout.locator(".lux-total")).toContainText("580.000₫");
  await checkout
    .getByRole("link", { name: "Tiến hành thanh toán", exact: true })
    .click();
  await expect(checkout.locator(".checkout-total")).toContainText("580.000₫");
  await checkout.getByLabel("Số điện thoại", { exact: true }).fill(buyer.phone);
  await checkout
    .getByLabel("Tỉnh / thành phố", { exact: true })
    .selectOption("79");
  await checkout
    .getByLabel("Phường / xã / đặc khu", { exact: true })
    .selectOption("25747");
  await checkout
    .getByLabel("Địa chỉ cụ thể", { exact: true })
    .fill(buyer.addressLine);
  await checkout.screenshot({
    path: "scr/test-data/results/checkout-voucher-mobile.png",
    fullPage: true,
  });
  await checkout.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await expect(checkout).toHaveURL(/\/account$/);
  const latest = await Order.findOne({ user: customerUser._id })
    .sort({ createdAt: -1 })
    .lean();
  check(
    latest.total === 580000 && latest.voucher.code === "MIRA10",
    "cart voucher carries to mobile checkout and creates an order with the correct server total",
  );
  check(
    errors.length === 0,
    "promotion browser flows have no JavaScript errors",
  );
  console.log(`${checks} promotion checks passed; live Atlas data untouched.`);
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
}
