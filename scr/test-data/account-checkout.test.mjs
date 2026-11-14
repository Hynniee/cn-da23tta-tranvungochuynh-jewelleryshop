import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";

// Real address/order API requests use only this disposable database. Atlas is never used.
process.env.JWT_SECRET = "isolated-address-test-secret-32-characters";
process.env.BANK_NAME = "Fixture bank";
process.env.BANK_BIN = "970403";
process.env.BANK_ACCOUNT_NO = "0000000000000";
process.env.BANK_ACCOUNT_NAME = "FIXTURE ONLY";
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri());
const { default: app } = await import("../server/dist/app.js");
const { default: User } = await import("../server/dist/models/User.js");
const { default: Product } = await import("../server/dist/models/Product.js");
const { default: Order } = await import("../server/dist/models/Order.js");
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const web = process.env.UI_TEST_URL || "http://127.0.0.1:5173";
let browser,
  checks = 0;
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
  console.log("PASS", label);
}
const user = async (name) => {
  const value = await User.create({
    name,
    email: `${name}@example.com`,
    phone: "0901234567",
    password: "unused-fixture-only",
  });
  return {
    value,
    token: jwt.sign(
      { id: String(value._id), role: "customer" },
      process.env.JWT_SECRET,
    ),
  };
};
async function api(path, { method = "GET", token, body, status = 200 } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
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
const address = {
  label: "Nhà riêng",
  name: "Người nhận kiểm thử",
  phone: "0901234567",
  provinceCode: "79",
  wardCode: "25747",
  addressLine: "12 Nguyễn Huệ",
};
try {
  const a = await user("address-a"),
    b = await user("address-b"),
    limit = await user("address-limit"),
    ui = await user("address-ui");
  const product = await Product.create({
    name: "Nhẫn sổ địa chỉ",
    slug: "address-book-ring",
    category: "Nhẫn",
    material: "Bạc 925",
    price: 650000,
    stock: 50,
    sizes: ["Tiêu chuẩn"],
    images: ["/products/nhan-bac-flora.svg"],
  });
  const orderBody = {
    items: [{ product: String(product._id), quantity: 1, size: "Tiêu chuẩn" }],
    customer: { ...address, email: "" },
    paymentMethod: "COD",
  };
  await User.collection.updateOne(
    { _id: a.value._id },
    {
      $unset: { addresses: 1, defaultAddressId: 1 },
      $set: { address: "Địa chỉ cũ giữ nguyên" },
    },
  );
  assert.deepEqual(await api("/auth/me/addresses", { token: a.token }), []);
  await api("/orders", {
    method: "POST",
    token: a.token,
    body: { ...orderBody, addressId: "missing-address" },
    status: 404,
  });
  await api("/auth/me/addresses", { status: 401 });
  await api("/auth/me/addresses", {
    method: "POST",
    body: address,
    status: 401,
  });
  await api("/auth/me/addresses", {
    method: "POST",
    token: a.token,
    body: { ...address, provinceCode: "01" },
    status: 400,
  });
  let list = await api("/auth/me/addresses", {
    method: "POST",
    token: a.token,
    body: { ...address, user: b.value._id, role: "admin" },
    status: 201,
  });
  const first = list[0];
  check(
    first.isDefault &&
      first.address.includes("Thành phố Hồ Chí Minh") &&
      (await api("/auth/me/addresses", { token: b.token })).length === 0,
    "address creation canonicalizes locality, auto-defaults first entry and stays owner-scoped",
  );
  list = await api("/auth/me/addresses", {
    method: "POST",
    token: a.token,
    body: {
      ...address,
      label: "Công ty",
      addressLine: "24 Nguyễn Trãi",
      isDefault: true,
    },
    status: 201,
  });
  const second = list.find((x) => x._id !== first._id);
  check(
    second.isDefault && list.filter((x) => x.isDefault).length === 1,
    "only one address is default",
  );
  for (const [method, path] of [
    ["PATCH", first._id],
    ["PATCH", `${first._id}/default`],
    ["DELETE", first._id],
  ])
    await api(`/auth/me/addresses/${path}`, {
      method,
      token: b.token,
      body: address,
      status: 404,
    });
  await api("/orders", {
    method: "POST",
    token: b.token,
    body: { ...orderBody, addressId: first._id },
    status: 404,
  });
  check(
    true,
    "another user cannot edit, delete, default or order with a foreign address",
  );
  const savedOrder = await api("/orders", {
    method: "POST",
    token: a.token,
    body: {
      ...orderBody,
      addressId: first._id,
      customer: { name: "Forged recipient", email: "" },
    },
    status: 201,
  });
  assert.equal(savedOrder.customer.name, address.name);
  assert.equal(savedOrder.customer.addressLine, address.addressLine);
  await api(`/orders/${savedOrder._id}`, { token: b.token, status: 404 });
  list = await api(`/auth/me/addresses/${first._id}`, {
    method: "PATCH",
    token: a.token,
    body: { ...address, addressLine: "99 Nguyễn Huệ" },
  });
  assert.equal(
    list.find((x) => x._id === first._id).addressLine,
    "99 Nguyễn Huệ",
  );
  await api(`/auth/me/addresses/${first._id}/default`, {
    method: "PATCH",
    token: a.token,
  });
  list = await api(`/auth/me/addresses/${first._id}`, {
    method: "DELETE",
    token: a.token,
  });
  assert.equal(list[0]._id, second._id);
  assert.equal(list[0].isDefault, true);
  assert.equal(
    (await api(`/orders/${savedOrder._id}`, { token: a.token })).customer
      .addressLine,
    address.addressLine,
  );
  await api("/orders", {
    method: "POST",
    token: a.token,
    body: { ...orderBody, addressId: first._id },
    status: 404,
  });
  check(
    true,
    "editing/deleting addresses preserves order snapshots and deletion selects a remaining default",
  );
  const results = await Promise.all(
    Array.from({ length: 24 }, (_, i) =>
      fetch(`${base}/api/auth/me/addresses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${limit.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...address, label: `Fixture ${i}` }),
      }),
    ),
  );
  const limited = await api("/auth/me/addresses", { token: limit.token });
  check(
    results.filter((r) => r.status === 201).length === 20 &&
      results.every((r) => [201, 409].includes(r.status)) &&
      limited.length === 20 &&
      limited.filter((x) => x.isDefault).length === 1,
    "concurrent address additions respect the 20-entry limit and single default",
  );
  await api(`/auth/me/addresses/${second._id}`, {
    method: "DELETE",
    token: a.token,
  });
  const recreated = await api("/auth/me/addresses", {
    method: "POST",
    token: a.token,
    body: address,
    status: 201,
  });
  check(
    recreated.length === 1 && recreated[0].isDefault,
    "empty address books can be reused after deleting the final default",
  );

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  let paymentReads = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/payments/order/")) paymentReads++;
    await route.fulfill({
      response: await route.fetch({ url: base + url.pathname + url.search }),
    });
  });
  await page.route("https://img.vietqr.io/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/></svg>',
    }),
  );
  await page.addInitScript(
    ({ token, id }) => {
      localStorage.setItem("mira_token", token);
      localStorage.setItem(
        "mira_user",
        JSON.stringify({
          name: "address-ui",
          email: "address-ui@example.com",
          id,
        }),
      );
    },
    { token: ui.token, id: String(ui.value._id) },
  );
  await page.goto(web + "/account");
  await expect(
    page.getByRole("heading", { name: "Thông Tin Cá Nhân", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".account-form")
      .getByLabel("Địa chỉ giao hàng", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sổ địa chỉ", exact: true }).click();
  await expect(
    page.getByLabel("Tỉnh / thành phố", { exact: true }),
  ).toHaveCount(0);
  async function fillAddress(line) {
    await page
      .getByLabel("Họ và tên người nhận", { exact: true })
      .fill("Khách hàng MIRA");
    await page
      .getByLabel("Số điện thoại NGƯỜI NHẬN", { exact: true })
      .fill("0901234567");
    await page
      .getByLabel("Tỉnh / thành phố", { exact: true })
      .selectOption("79");
    await page
      .getByLabel("Phường / xã / đặc khu", { exact: true })
      .selectOption("25747");
    await page.getByLabel("Địa chỉ cụ thể", { exact: true }).fill(line);
  }
  await page.getByRole("button", { name: "Thêm địa chỉ", exact: true }).click();
  await expect(
    page.getByLabel("Tỉnh / thành phố", { exact: true }).locator("option"),
  ).toHaveCount(35);
  await fillAddress("10 Đường Nhà Riêng");
  await page.getByRole("button", { name: "Lưu địa chỉ", exact: true }).click();
  await expect(page.locator(".saved-address-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".saved-address-card")).toContainText(
    "10 Đường Nhà Riêng",
  );
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await page
    .getByLabel("Địa chỉ cụ thể", { exact: true })
    .fill("12 Đường Nhà Riêng");
  await page.getByRole("button", { name: "Lưu địa chỉ", exact: true }).click();
  await expect(page.locator(".saved-address-card")).toContainText(
    "12 Đường Nhà Riêng",
  );
  await page.getByRole("button", { name: "Thêm địa chỉ", exact: true }).click();
  await fillAddress("22 Đường Công Ty");
  await page.getByLabel("TÊN GỢI NHỚ", { exact: true }).selectOption("Công ty");
  await page.getByRole("button", { name: "Lưu địa chỉ", exact: true }).click();
  await page
    .locator(".saved-address-card")
    .filter({ hasText: "Công ty" })
    .getByRole("button", { name: "Đặt mặc định", exact: true })
    .click();
  await expect(
    page.locator(".saved-address-card").filter({ hasText: "Công ty" }),
  ).toContainText("Mặc định");
  check(
    true,
    "profile hides freeform address; address form opens on demand, loads 34 provinces, persists, edits and defaults from browser",
  );
  await fs.mkdir("scr/test-data/results/account-checkout", { recursive: true });
  await page.screenshot({
    path: "scr/test-data/results/account-checkout/addresses-desktop.png",
    fullPage: true,
  });
  const uiAddresses = await api("/auth/me/addresses", { token: ui.token });
  const home = uiAddresses.find((x) => x.label === "Nhà riêng");
  const seedCart = async () =>
    page.evaluate(
      (product) => {
        localStorage.setItem(
          "mira_cart",
          JSON.stringify([
            {
              _id: product._id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              quantity: 1,
              size: "Tiêu chuẩn",
              stock: product.stock,
              image: product.images[0],
            },
          ]),
        );
      },
      JSON.parse(JSON.stringify(product)),
    );
  await seedCart();
  await page.goto(web + "/checkout");
  await expect(
    page.getByRole("combobox", { name: "Chọn địa chỉ giao hàng", exact: true }),
  ).toHaveValue("new");
  await expect(
    page.getByLabel("Tỉnh / thành phố", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Địa chỉ cụ thể", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.locator(".checkout-saved-address")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Chọn địa chỉ giao hàng", exact: true }),
  ).toHaveValue("new");
  await page
    .getByRole("combobox", { name: "Chọn địa chỉ giao hàng", exact: true })
    .selectOption(home._id);
  await expect(page.locator(".checkout-saved-address")).toContainText(
    "12 Đường Nhà Riêng",
  );
  await page.getByLabel("Email (không bắt buộc)", { exact: true }).fill("");
  await page.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  const uiOrders = await api("/orders/mine", { token: ui.token });
  assert.equal(uiOrders[0].customer.addressLine, "12 Đường Nhà Riêng");
  await seedCart();
  await page.goto(web + "/checkout");
  await page
    .getByRole("combobox", { name: "Chọn địa chỉ giao hàng", exact: true })
    .selectOption("new");
  await expect(
    page.getByLabel("Tỉnh / thành phố", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Họ và tên", { exact: true }).fill("Người nhận mới");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0907654321");
  await page.getByLabel("Tỉnh / thành phố", { exact: true }).selectOption("79");
  await page
    .getByLabel("Phường / xã / đặc khu", { exact: true })
    .selectOption("25747");
  await page
    .getByLabel("Địa chỉ cụ thể", { exact: true })
    .fill("99 Địa Chỉ Mới");
  await page.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  const fresh = await api("/orders/mine", { token: ui.token });
  assert.equal(fresh[0].customer.addressLine, "99 Địa Chỉ Mới");
  assert.equal(
    (await api("/auth/me/addresses", { token: ui.token })).length,
    2,
  );
  check(
    true,
    "checkout defaults to new address even after reload; saved addresses are explicitly selected and order snapshots remain independent",
  );

  const bankOrder = await api("/orders", {
    method: "POST",
    token: ui.token,
    body: { ...orderBody, addressId: home._id, paymentMethod: "BANK_QR" },
    status: 201,
  });
  await page.clock.install();
  await page.goto(web + `/checkout?order=${bankOrder._id}`);
  await page
    .getByRole("button", { name: "Tôi đã chuyển khoản", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/thank-you\\?order=${bankOrder._id}$`),
  );
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn đã chọn MIRA", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".thankyou-payment")).toContainText(
    "Đang chờ xác nhận thanh toán",
  );
  assert.equal((await Order.findById(bankOrder._id)).paymentStatus, "PENDING");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `scr/test-data/results/account-checkout/thank-you-${width}.png`,
      fullPage: true,
    });
  }
  await Order.updateOne(
    { _id: bankOrder._id },
    { $set: { paymentStatus: "PAID", status: "confirmed" } },
  );
  await page.clock.runFor(5000);
  await expect(page.locator(".thankyou-payment")).toContainText(
    "Đã xác nhận thanh toán",
  );
  const paidReads = paymentReads;
  await page.clock.runFor(15000);
  assert.equal(paymentReads, paidReads);
  await page
    .getByRole("link", { name: "Xem chi tiết đơn hàng", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Chi tiết đơn hàng", exact: true }),
  ).toContainText(bankOrder.orderCode);
  await page.keyboard.press("Escape");
  check(
    true,
    "transfer acknowledgement opens thank-you without marking paid; server confirmation auto-updates and links correct order popup",
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const aligned = await page
      .locator(".account-orders-table")
      .evaluate((table) => {
        const head = [...table.querySelectorAll("th")].map(
          (x) => x.getBoundingClientRect().left,
        );
        const rows = [...table.querySelectorAll("tbody tr")];
        return (
          rows.every((row) =>
            [...row.cells].every(
              (cell, i) =>
                Math.abs(cell.getBoundingClientRect().left - head[i]) < 1,
            ),
          ) &&
          rows.every(
            (row) =>
              Math.abs(
                row.getBoundingClientRect().height -
                  rows[0].getBoundingClientRect().height,
              ) < 1,
          )
        );
      });
    assert.ok(aligned, "Order columns align and rows have uniform height");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `scr/test-data/results/account-checkout/orders-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Sổ địa chỉ", exact: true }).click();
  await page.getByRole("button", { name: "Thêm địa chỉ", exact: true }).click();
  await expect(
    page.getByLabel("Tỉnh / thành phố", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "scr/test-data/results/account-checkout/address-form-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  check(
    errors.length === 0,
    "uniform order rows, mobile address form and thank-you at 320/390/1440 fit without JavaScript errors",
  );
  console.log(`${checks} account/checkout groups passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
}
