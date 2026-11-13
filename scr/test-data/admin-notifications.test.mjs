import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

process.env.JWT_SECRET = "isolated-admin-notification-test-secret";
process.env.GEMINI_API_KEY = "";
process.env.MONGO_URI = "";
const root = fileURLToPath(new URL("../../", import.meta.url));
let mongo,
  server,
  vite,
  browser,
  base,
  checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log(`PASS ${label}`);
};
async function api(
  endpoint,
  { token, method = "GET", body, status = 200 } = {},
) {
  const response = await fetch(base + endpoint, {
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
    `${method} ${endpoint}: ${JSON.stringify(data)}`,
  );
  return data;
}
try {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { default: app } = await import("../server/dist/app.js");
  const { default: User } = await import("../server/dist/models/User.js");
  const { default: Order } = await import("../server/dist/models/Order.js");
  const { default: Product } = await import("../server/dist/models/Product.js");
  const { default: Payment } = await import("../server/dist/models/Payment.js");
  const { default: Promotion } =
    await import("../server/dist/models/Promotion.js");
  const { default: Behavior } =
    await import("../server/dist/models/Behavior.js");
  const { default: AuditLog } =
    await import("../server/dist/models/AuditLog.js");
  const users = await User.create([
    {
      name: "Admin Test",
      email: "admin@notice.test",
      password: "unused",
      role: "admin",
    },
    {
      name: "Manager Test",
      email: "manager@notice.test",
      password: "unused",
      role: "manager",
    },
    {
      name: "Khách hàng mới",
      email: "customer@notice.test",
      password: "unused",
    },
  ]);
  const sign = (user) =>
    jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET);
  const admin = sign(users[0]),
    manager = sign(users[1]),
    customer = sign(users[2]);
  const product = await Product.create({
    name: "Nhẫn cần nhập thêm",
    slug: "low-stock-notification-ring",
    category: "Nhẫn",
    material: "Bạc 925",
    price: 500000,
    stock: 4,
    images: ["/placeholder.svg"],
  });
  const order = await Order.create({
    orderCode: "NOTICE-COD",
    user: users[2]._id,
    customer: { name: users[2].name, email: users[2].email },
    total: 500000,
    status: "pending",
    paymentMethod: "COD",
    items: [{ product: product._id, quantity: 1 }],
  });
  const bankOrder = await Order.create({
    orderCode: "NOTICE-BANK",
    user: users[2]._id,
    customer: { name: users[2].name },
    total: 500000,
    status: "pending_payment",
    paymentMethod: "BANK_QR",
    items: [],
  });
  await Payment.create({
    order: bankOrder._id,
    orderCode: bankOrder.orderCode,
    amountExpected: 500000,
    amountReceived: 400000,
    status: "MISMATCH",
  });
  await Promotion.create({
    name: "Ưu đãi sắp kết thúc",
    type: "discount",
    discountType: "percent",
    value: 10,
    active: true,
    startsAt: new Date(Date.now() - 3600000),
    endsAt: new Date(Date.now() + 3600000),
    allProducts: true,
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  base = `${origin}/api`;
  await api("/admin/notifications", { status: 401 });
  await api("/admin/notifications", { token: customer, status: 403 });
  await api("/admin/notifications/customers/read", {
    token: customer,
    method: "POST",
    status: 403,
  });
  check(
    true,
    "notification counts and read markers require admin/manager permissions",
  );
  const notices = await api("/admin/notifications", { token: admin });
  check(
    notices.orders.count === 2 &&
      notices.products.count === 1 &&
      notices.customers.count === 1 &&
      notices.promotions.count === 1 &&
      notices.analytics.count === 1 &&
      notices.overview === undefined,
    "each admin section returns its real actionable notification count",
  );
  await api("/admin/notifications/customers/read", {
    token: admin,
    method: "POST",
  });
  check(
    (await api("/admin/notifications", { token: admin })).customers.count ===
      0 &&
      (await api("/admin/notifications", { token: manager })).customers
        .count === 1,
    "customer notifications stay read for the current administrator without affecting other administrators",
  );
  await User.create({
    name: "Khách đăng ký tiếp theo",
    email: "second@notice.test",
    password: "unused",
  });
  check(
    (await api("/admin/notifications", { token: admin })).customers.count === 1,
    "new registrations reappear after previously reading customer notifications",
  );
  await api(`/orders/${order._id}/status`, {
    token: customer,
    method: "PATCH",
    body: { status: "confirmed" },
    status: 403,
  });
  await api(`/orders/${order._id}/status`, {
    token: admin,
    method: "PATCH",
    body: { status: "completed" },
    status: 400,
  });
  check(
    (await Order.findById(order._id)).status === "pending",
    "customers cannot change order processing states and invalid transitions do not alter orders",
  );
  await api(`/orders/${bankOrder._id}/status`, {
    token: customer,
    method: "PATCH",
    body: { status: "confirmed", confirmPayment: true },
    status: 403,
  });
  await api(`/orders/${bankOrder._id}/status`, {
    token: admin,
    method: "PATCH",
    body: { status: "confirmed" },
    status: 400,
  });
  await api(`/orders/${bankOrder._id}/status`, {
    token: admin,
    method: "PATCH",
    body: { status: "shipping", confirmPayment: true },
    status: 400,
  });
  await api(`/orders/${bankOrder._id}/status`, {
    token: admin,
    method: "PATCH",
    body: { status: "delivered" },
    status: 400,
  });
  check(
    (await Order.findById(bankOrder._id)).status === "pending_payment",
    "bank orders require an explicit authorized payment confirmation before changing processing state",
  );

  vite = await createServer({
    configFile: path.join(root, "scr/client/vite.config.ts"),
    root: path.join(root, "scr/client"),
    server: { host: "127.0.0.1", port: 5198, proxy: { "/api": origin } },
    logLevel: "error",
  });
  await vite.listen();
  const web = vite.resolvedUrls.local[0];
  browser = await chromium.launch({
    channel: process.env.TEST_BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(web);
  await page.evaluate(
    ({ accessToken, user }) => {
      localStorage.setItem("mira_token", accessToken);
      localStorage.setItem("mira_user", JSON.stringify(user));
    },
    {
      accessToken: admin,
      user: { id: String(users[0]._id), role: "admin", name: "Admin Test" },
    },
  );
  await page.goto(`${web}admin`);
  const nav = page.locator(".admin-nav");
  await expect(nav.getByRole("button").first()).toHaveAccessibleName(
    "Tổng quan",
  );
  await expect(nav.getByRole("button").first()).toHaveAttribute(
    "aria-current",
    "page",
  );
  const orderMenu = nav.getByRole("button", { name: "Đơn hàng", exact: true });
  await expect(orderMenu.locator(".admin-notification-badge")).toHaveText("2");
  check(
    true,
    "Overview is the first menu item and order notifications are visible on initial load",
  );
  await orderMenu.click();
  const status = page.getByRole("combobox", {
    name: "Trạng thái đơn NOTICE-COD",
    exact: true,
  });
  await expect(status).toHaveValue("pending");
  let release;
  const saving = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/orders/${order._id}/status`, async (route) => {
    await saving;
    await route.continue();
  });
  await status.selectOption("confirmed");
  await page
    .getByRole("button", { name: "Cập nhật đơn NOTICE-COD", exact: true })
    .click();
  await expect(status).toBeDisabled();
  release();
  await expect(status).toHaveValue("confirmed");
  await expect(status).toBeEnabled();
  await expect(orderMenu.locator(".admin-notification-badge")).toHaveText("1");
  await expect(page.getByText(/Đã chuyển đơn NOTICE-COD sang/)).toBeVisible();
  check(
    (await Order.findById(order._id)).status === "confirmed",
    "admin changes order state in browser, prevents duplicate saves and updates the badge from two to one",
  );
  const initialOptions = await status.locator("option").evaluateAll((options) =>
    options.map((option) => ({
      value: option.value,
      disabled: option.disabled,
    })),
  );
  check(
    ["shipping", "delivered", "completed"].every((value) =>
      initialOptions.some(
        (option) => option.value === value && !option.disabled,
      ),
    ),
    "confirmed orders immediately offer Shipping, Delivered and Completed in the same dropdown",
  );
  const badgeStyle = await orderMenu
    .locator(".admin-notification-badge")
    .evaluate((badge) => {
      const style = getComputedStyle(badge);
      return {
        color: style.backgroundColor,
        radius: style.borderRadius,
        width: badge.offsetWidth,
        height: badge.offsetHeight,
      };
    });
  check(
    badgeStyle.color === "rgb(247, 220, 229)" &&
      badgeStyle.radius === "999px" &&
      badgeStyle.width === badgeStyle.height,
    "single notifications use a circular light pastel pink badge",
  );
  await page.unroute(`**/api/orders/${order._id}/status`);
  await fs.mkdir(path.join(root, "scr/test-data/results"), { recursive: true });
  await page.screenshot({
    path: path.join(
      root,
      "scr/test-data/results/admin-notifications-desktop.png",
    ),
    fullPage: true,
  });
  const bankStatus = page.getByRole("combobox", {
    name: "Trạng thái đơn NOTICE-BANK",
    exact: true,
  });
  await bankStatus.selectOption("confirmed");
  const saveBank = page.getByRole("button", {
    name: "Cập nhật đơn NOTICE-BANK",
    exact: true,
  });
  await expect(saveBank).toBeDisabled();
  check(
    (await Order.findById(bankOrder._id)).status === "pending_payment",
    "choosing a bank order status does not save or mark payment received until the admin confirms",
  );
  await page
    .getByRole("checkbox", {
      name: "Xác nhận đã nhận đủ tiền đơn NOTICE-BANK",
      exact: true,
    })
    .check();
  await saveBank.click();
  await expect(saveBank).toBeDisabled();
  await expect(bankStatus).toHaveValue("confirmed");
  await expect(orderMenu.locator(".admin-notification-badge")).toHaveCount(0);
  const confirmedBankOrder = await Order.findById(bankOrder._id);
  check(
    confirmedBankOrder.status === "confirmed" &&
      confirmedBankOrder.paymentStatus === "PAID" &&
      confirmedBankOrder.paymentConfirmationMethod === "ADMIN" &&
      confirmedBankOrder.paymentConfirmedAt,
    "admin confirms a pending bank order in the browser and persists both order and payment states",
  );
  check(
    (await api("/admin/notifications", { token: admin })).analytics.count ===
      0 &&
      (await Payment.findOne({ order: bankOrder._id })).status === "MISMATCH",
    "manual confirmation resolves the actionable mismatch while preserving the original bank evidence",
  );
  await page.reload();
  await nav.getByRole("button", { name: "Đơn hàng", exact: true }).click();
  await expect(status).toHaveValue("confirmed");
  await expect(bankStatus).toHaveValue("confirmed");
  check(true, "order state changes persist after reloading the admin page");
  await status.selectOption("delivered");
  await page
    .getByRole("button", { name: "Cập nhật đơn NOTICE-COD", exact: true })
    .click();
  await expect(status).toHaveValue("delivered");
  await expect(status).toBeEnabled();
  const deliveredOrder = await Order.findById(order._id);
  check(
    deliveredOrder.status === "delivered" &&
      (await Product.findById(product._id)).stock === 4 &&
      (await api("/orders/mine", { token: customer })).some(
        (item) => item._id === String(order._id) && item.status === "delivered",
      ),
    "admin can jump directly from Confirmed to Delivered and customer orders reflect it without changing stock",
  );
  check(
    JSON.stringify(
      await status
        .locator("option")
        .evaluateAll((options) => options.map((option) => option.value)),
    ) === JSON.stringify(initialOptions.map((option) => option.value)),
    "dropdown option list stays stable after a status change",
  );
  await nav.getByRole("button", { name: "Khách hàng", exact: true }).click();
  await expect(page.locator(".customer-management tbody tr")).toHaveCount(2);
  await expect(
    nav
      .getByRole("button", { name: "Khách hàng", exact: true })
      .locator(".admin-notification-badge"),
  ).toHaveCount(0);
  check(
    (await api("/admin/notifications", { token: admin })).customers.count === 0,
    "opening the customer section clears its unread badge after loading the list",
  );
  await nav.getByRole("button", { name: "Đơn hàng", exact: true }).click();
  const additionalOrder = await Order.create({
    orderCode: "NOTICE-NEW",
    user: users[2]._id,
    status: "pending",
    paymentMethod: "COD",
    total: 500000,
    items: [],
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(orderMenu.locator(".admin-notification-badge")).toHaveText("1", {
    timeout: 20000,
  });
  await expect(
    page.getByRole("combobox", {
      name: "Trạng thái đơn NOTICE-NEW",
      exact: true,
    }),
  ).toBeVisible();
  check(
    true,
    "new orders automatically update the badge and order list when admin regains focus or polls",
  );
  await api(`/orders/${order._id}/status`, {
    token: manager,
    method: "PATCH",
    body: { status: "completed" },
  });
  check(
    (await Order.findById(order._id)).paymentStatus === "PAID" &&
      (await Behavior.countDocuments({
        type: "PURCHASE",
        user: users[2]._id,
      })) === 1 &&
      (await AuditLog.countDocuments({
        entityId: String(order._id),
        action: "UPDATE_ORDER_STATUS",
      })) === 3,
    "admin/manager can complete orders with one purchase event and an audit trail",
  );
  const directOrder = await Order.create({
    orderCode: "NOTICE-DIRECT-COMPLETE",
    user: users[2]._id,
    status: "confirmed",
    paymentMethod: "COD",
    total: 500000,
    items: [],
  });
  const directlyCompleted = await api(`/orders/${directOrder._id}/status`, {
    token: admin,
    method: "PATCH",
    body: { status: "completed" },
  });
  check(
    directlyCompleted.status === "completed" &&
      directlyCompleted.paymentStatus === "PAID",
    "confirmed orders can also go directly to Completed without saving intermediate steps",
  );
  await api(`/orders/${bankOrder._id}/status`, {
    token: admin,
    method: "PATCH",
    body: { status: "cancelled" },
  });
  await api(`/orders/${additionalOrder._id}/status`, {
    token: admin,
    method: "PATCH",
    body: { status: "cancelled" },
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(orderMenu.locator(".admin-notification-badge")).toHaveCount(0, {
    timeout: 20000,
  });
  check(
    (await api("/admin/notifications", { token: admin })).orders.count === 0,
    "order badges disappear when no orders remain awaiting action",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const stockBadge = nav
    .getByRole("button", { name: "Sản phẩm", exact: true })
    .locator(".admin-notification-badge");
  await expect(stockBadge).toBeVisible();
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "notification badges remain visible on mobile without page overflow",
  );
  await page.screenshot({
    path: path.join(
      root,
      "scr/test-data/results/admin-notifications-mobile.png",
    ),
    fullPage: true,
  });
  check(
    errors.length === 0,
    `admin notification browser flows have no JavaScript errors: ${errors.join("; ")}`,
  );
  console.log(`\n${checks} admin notification checks passed.`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}
