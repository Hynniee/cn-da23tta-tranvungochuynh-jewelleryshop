import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

process.env.JWT_SECRET = "isolated-support-test-secret-32-characters";
const root = fileURLToPath(new URL("../../", import.meta.url));
let mongo, server, vite, browser;
let checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  console.log("PASS", label);
  checks++;
};
try {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { default: app } = await import("../server/dist/app.js");
  const { default: User } = await import("../server/dist/models/User.js");
  const { default: Order } = await import("../server/dist/models/Order.js");
  const { default: Conversation } =
    await import("../server/dist/models/SupportConversation.js");
  const { default: Message } =
    await import("../server/dist/models/SupportMessage.js");
  await Promise.all([
    User.init(),
    Order.init(),
    Conversation.init(),
    Message.init(),
  ]);
  const [buyer, other, administrator, manager] = await User.create([
    { name: "Khách hỗ trợ", email: "buyer@support.test", password: "unused" },
    { name: "Khách thứ hai", email: "other@support.test", password: "unused" },
    {
      name: "Admin hỗ trợ",
      email: "admin@support.test",
      password: "unused",
      role: "admin",
    },
    {
      name: "Quản lý hỗ trợ",
      email: "manager@support.test",
      password: "unused",
      role: "manager",
    },
  ]);
  const sign = (user, role = user.role) =>
    jwt.sign({ id: String(user._id), role }, process.env.JWT_SECRET);
  const customer = sign(buyer),
    second = sign(other),
    admin = sign(administrator);
  const order = await Order.create({
    user: buyer._id,
    orderCode: "MIRA-SUPPORT-TEST",
    total: 1000000,
    customer: { name: buyer.name, email: buyer.email },
    items: [{ name: "Nhẫn thử nghiệm", price: 1000000, quantity: 1 }],
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  async function api(
    url,
    { token = customer, method = "GET", body, status = 200 } = {},
  ) {
    const response = await fetch(`${base}/api${url}`, {
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
      `${method} ${url}: ${JSON.stringify(data)}`,
    );
    return data;
  }
  await api("/support/mine", { token: null, status: 401 });
  const empty = await api("/support/mine");
  check(
    empty.conversation === null && (await Conversation.countDocuments()) === 0,
    "opening support does not create an empty conversation",
  );
  for (const body of [
    { body: "  ", clientId: randomUUID() },
    { body: "x".repeat(2001), clientId: randomUUID() },
    { body: "Hello", clientId: "short" },
    { body: { $gt: "" }, clientId: randomUUID() },
  ])
    await api("/support/mine/messages", { method: "POST", body, status: 400 });
  await api("/support/mine/messages", {
    token: second,
    method: "POST",
    body: {
      body: "Xem đơn khác",
      clientId: randomUUID(),
      orderId: String(order._id),
    },
    status: 404,
  });
  check(
    (await Conversation.countDocuments()) === 0,
    "invalid messages and another customer's order are rejected without creating conversations",
  );
  const sendBody = {
    body: "Cần kiểm tra thanh toán",
    clientId: randomUUID(),
    orderId: String(order._id),
  };
  const sent = await api("/support/mine/messages", {
    method: "POST",
    body: sendBody,
    status: 201,
  });
  const duplicate = await api("/support/mine/messages", {
    method: "POST",
    body: sendBody,
  });
  check(
    sent._id === duplicate._id &&
      sent.orderCode === order.orderCode &&
      (await Message.countDocuments()) === 1,
    "sending stores order context and retries do not duplicate messages",
  );
  await api("/support/mine/messages", {
    method: "POST",
    body: { ...sendBody, body: "Different payload" },
    status: 409,
  });
  const concurrentBody = { body: "Gửi đồng thời", clientId: randomUUID() };
  const responses = await Promise.all(
    [0, 1].map(() =>
      fetch(`${base}/api/support/mine/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${second}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(concurrentBody),
      }),
    ),
  );
  check(
    responses.every((response) => [200, 201].includes(response.status)) &&
      (await Conversation.countDocuments({ customer: other._id })) === 1 &&
      (await Message.countDocuments({ sender: other._id })) === 1,
    "simultaneous retries create one conversation and one message",
  );
  const mine = await api("/support/mine");
  const conversationId = mine.conversation._id;
  await api("/support/admin", { status: 403 });
  await api(`/support/admin/${conversationId}`, { token: second, status: 403 });
  await api("/support/admin", { token: sign(other, "admin"), status: 403 });
  await api("/support/admin/unread", { token: sign(manager) });
  check(
    (await api("/support/mine", { token: second })).messages.every(
      (message) => message.sender !== String(buyer._id),
    ),
    "customers cannot read admin inbox or another customer's messages, even with a forged JWT role",
  );
  const inbox = await api("/support/admin", { token: admin });
  check(
    inbox.total === 2 &&
      inbox.items.find((item) => item._id === conversationId).unreadCount ===
        1 &&
      !JSON.stringify(inbox).includes("password"),
    "admin inbox includes unread counts and safe customer profiles",
  );
  await api("/support/admin?q=%5B", { token: admin });
  await api(`/support/admin/not-an-id`, { token: admin, status: 400 });
  const incoming = await api("/support/mine/messages", {
    method: "POST",
    body: { body: "Tin mới chưa xem", clientId: randomUUID() },
    status: 201,
  });
  await api(`/support/admin/${conversationId}/read`, {
    token: admin,
    method: "POST",
    body: { ids: [sent._id] },
  });
  check(
    (await Message.findById(incoming._id)).readAt === null &&
      (await Message.findById(sent._id)).readAt !== null,
    "read acknowledgements do not mark a concurrently arriving message as read",
  );
  const reply = await api(`/support/admin/${conversationId}/messages`, {
    token: admin,
    method: "POST",
    body: { body: "MIRA đã nhận yêu cầu của bạn.", clientId: randomUUID() },
    status: 201,
  });
  check(
    (
      await api("/support/mine/read", {
        token: second,
        method: "POST",
        body: { ids: [reply._id] },
      })
    ).updated === 0,
    "a different customer cannot acknowledge someone else's messages",
  );
  await api("/support/mine/read", {
    method: "POST",
    body: { ids: [reply._id] },
  });
  check(
    (await Message.findById(reply._id)).readAt !== null,
    "customer receives and acknowledges admin replies",
  );
  await api(`/support/admin/${conversationId}`, {
    token: admin,
    method: "PATCH",
    body: { status: "resolved" },
  });
  check(
    (await api("/support/admin?status=resolved", { token: admin })).total === 1,
    "admin can resolve and filter conversations",
  );
  await api("/support/mine/messages", { method: "POST", body: sendBody });
  check(
    (await api("/support/mine")).conversation.status === "resolved",
    "retrying an old message does not reopen a resolved conversation",
  );
  await api(`/support/admin/${conversationId}`, {
    token: admin,
    method: "PATCH",
    body: { status: "invalid" },
    status: 400,
  });
  await api("/support/mine/messages", {
    method: "POST",
    body: { body: "Cần hỗ trợ thêm", clientId: randomUUID() },
    status: 201,
  });
  check(
    (await api("/support/mine")).conversation.status === "open",
    "new messages reopen a resolved conversation",
  );
  await Message.insertMany(
    Array.from({ length: 55 }, (_, index) => ({
      conversation: conversationId,
      sender: buyer._id,
      senderRole: "customer",
      body: `History ${index}`,
      clientId: randomUUID(),
    })),
  );
  const recent = await api("/support/mine");
  const earlier = await api(`/support/mine?before=${recent.messages[0]._id}`);
  check(
    recent.messages.length === 50 &&
      recent.hasMore &&
      earlier.messages.length > 0 &&
      !earlier.messages.some((message) =>
        recent.messages.some((item) => item._id === message._id),
      ),
    "message history paginates without overlap",
  );
  const removed = await User.create({
    name: "Removed",
    email: "removed@support.test",
    password: "unused",
  });
  const removedToken = sign(removed);
  await User.deleteOne({ _id: removed._id });
  await api("/support/mine", { token: removedToken, status: 401 });
  check(true, "deleted accounts cannot use support endpoints");

  // All fixtures are in the fresh, isolated in-memory test database.
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  process.env.API_PROXY_TARGET = base;
  vite = await createServer({
    configFile: path.join(root, "scr/client/vite.config.ts"),
    root: path.join(root, "scr/client"),
    server: { host: "127.0.0.1", port: 0 },
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  async function session(user, accessToken, width = 1440) {
    const context = await browser.newContext({
      viewport: { width, height: 960 },
    });
    await context.addInitScript(
      ({ accessToken, user }) => {
        localStorage.setItem("mira_token", accessToken);
        localStorage.setItem("mira_user", JSON.stringify(user));
      },
      {
        accessToken,
        user: { name: user.name, email: user.email, role: user.role },
      },
    );
    return { context, page: await context.newPage() };
  }
  const guest = await browser.newPage();
  await guest.goto(`${url}/support?order=${order._id}`);
  await expect(
    guest.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toHaveAttribute(
    "href",
    `/login?next=${encodeURIComponent(`/support?order=${order._id}`)}`,
  );
  await guest.close();
  const customerUI = await session(buyer, customer);
  await customerUI.page.goto(`${url}/account?tab=orders&order=${order._id}`);
  await customerUI.page
    .getByRole("dialog")
    .getByRole("link", { name: "Liên hệ hỗ trợ", exact: true })
    .click();
  await expect(customerUI.page).toHaveURL(
    new RegExp(`/support\\?order=${order._id}$`),
  );
  const draft = customerUI.page.getByRole("textbox", {
    name: "Nhắn cho nhân viên MIRA",
  });
  const text =
    "Đơn hàng của tôi đã thanh toán chưa? <script>window.supportXss=true</script>";
  await draft.fill(text);
  await customerUI.page
    .getByRole("button", { name: "Gửi tin nhắn", exact: true })
    .click();
  await expect(customerUI.page.locator(".support-message p")).toHaveText(text);
  await expect(customerUI.page.locator(".support-order")).toContainText(
    order.orderCode,
  );
  check(
    await customerUI.page.evaluate(() => !window.supportXss),
    "order support opens real chat and renders submitted text safely",
  );
  const adminUI = await session(administrator, admin);
  await adminUI.page.goto(`${url}/admin?tab=messages`);
  await expect(
    adminUI.page.getByRole("button", { name: "Tin nhắn", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await adminUI.page
    .locator(".support-conversations button")
    .filter({ hasText: buyer.name })
    .click();
  await expect(adminUI.page.locator(".support-message p")).toHaveText(text);
  await expect
    .poll(
      async () => (await api("/support/admin/unread", { token: admin })).count,
    )
    .toBe(0);
  await adminUI.page
    .getByRole("textbox", { name: "Trả lời khách hàng" })
    .fill("MIRA đang kiểm tra giao dịch, bạn chờ giúp mình nhé.");
  await adminUI.page
    .getByRole("button", { name: "Gửi tin nhắn", exact: true })
    .click();
  await expect(adminUI.page.locator(".support-message p").last()).toContainText(
    "MIRA đang kiểm tra giao dịch",
  );
  await customerUI.page.bringToFront();
  await expect(
    customerUI.page.locator(".support-message p").last(),
  ).toContainText("MIRA đang kiểm tra giao dịch", { timeout: 12000 });
  check(
    true,
    "customer and admin exchange persisted messages and unread counts clear on opening",
  );
  await adminUI.page.bringToFront();
  const replyDraft = adminUI.page.getByRole("textbox", {
    name: "Trả lời khách hàng",
  });
  await replyDraft.fill("Nội dung đang soạn");
  await adminUI.page
    .getByRole("button", { name: "Đánh dấu đã xử lý", exact: true })
    .click();
  await expect(
    adminUI.page.getByRole("button", { name: "Mở lại hội thoại", exact: true }),
  ).toBeVisible();
  await expect(replyDraft).toHaveValue("Nội dung đang soạn");
  check(true, "resolving a conversation preserves the admin's draft");
  await customerUI.page.bringToFront();
  await customerUI.page.route("**/api/support/mine/messages", (route) =>
    route.fulfill({ status: 503, json: { message: "Máy chủ tạm gián đoạn" } }),
  );
  await draft.fill("Giữ lại tin nhắn nếu gửi lỗi");
  await customerUI.page
    .getByRole("button", { name: "Gửi tin nhắn", exact: true })
    .click();
  await expect(customerUI.page.getByRole("alert")).toContainText(
    "Máy chủ tạm gián đoạn",
  );
  await expect(draft).toHaveValue("Giữ lại tin nhắn nếu gửi lỗi");
  await customerUI.page.unroute("**/api/support/mine/messages");
  await customerUI.page
    .getByRole("button", { name: "Gửi tin nhắn", exact: true })
    .click();
  await expect(draft).toHaveValue("");
  await customerUI.page.reload();
  await expect(customerUI.page.locator(".support-message p").last()).toHaveText(
    "Giữ lại tin nhắn nếu gửi lỗi",
  );
  check(
    true,
    "failed sends preserve the draft and retry persists it across reloads",
  );
  for (const width of [390, 320]) {
    await customerUI.page.setViewportSize({ width, height: 844 });
    await expect(draft).toBeVisible();
    check(
      await customerUI.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `customer chat fits ${width}px`,
    );
    await adminUI.page.setViewportSize({ width, height: 844 });
    await adminUI.page.bringToFront();
    await expect(replyDraft).toBeVisible();
    check(
      await adminUI.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `admin inbox fits ${width}px`,
    );
  }
  await adminUI.page.setViewportSize({ width: 1440, height: 960 });
  await adminUI.page.evaluate(() => {
    document.activeElement?.blur();
    scrollTo(0, 0);
  });
  await adminUI.page.screenshot({
    path: path.join(root, ".local-data/support-admin-desktop.png"),
    fullPage: true,
  });
  await customerUI.page.bringToFront();
  await customerUI.page.evaluate(() => {
    document.activeElement?.blur();
    scrollTo(0, 0);
  });
  await customerUI.page.waitForTimeout(250);
  await customerUI.page.screenshot({
    path: path.join(root, ".local-data/support-customer-mobile.png"),
    fullPage: true,
  });
  await adminUI.page.locator(".support-order").first().click();
  await expect(adminUI.page).toHaveURL(
    new RegExp(`/admin\\?tab=orders&order=${order._id}$`),
  );
  await expect(
    adminUI.page.getByRole("heading", { name: "Quản lý đơn hàng" }),
  ).toBeVisible();
  check(true, "admin can open the referenced order from a message");
  console.log(`Support: ${checks} checks passed.`);
} finally {
  await browser?.close();
  await vite?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  await mongo?.stop();
}
