import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

process.env.JWT_SECRET = "isolated-advisor-reset-test-secret-32-characters";
process.env.GEMINI_API_KEY = "";
const root = fileURLToPath(new URL("../../", import.meta.url));
let mongo, server, vite, browser;
let checks = 0;
const originalFetch = globalThis.fetch;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log("PASS", label);
};
try {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { default: app } = await import("../server/dist/app.js");
  const { default: Product } = await import("../server/dist/models/Product.js");
  const { default: AdvisorSession } =
    await import("../server/dist/models/AdvisorSession.js");
  const { classifyAdvisorMessage } =
    await import("../server/dist/services/advisor-message.js");
  await AdvisorSession.init();
  for (const message of [
    "hi",
    "HELLO!!! 👋",
    "xin chào MIRA AI ơi",
    "hey",
    "alo",
    "bắt đầu lại",
    "hội thoại mới",
    "reset",
    "start over",
  ]) {
    check(
      classifyAdvisorMessage(message).kind === "restart" &&
        !classifyAdvisorMessage(message).hasRequest,
      `recognizes small talk without a shopping request: ${message}`,
    );
  }
  for (const message of [
    "Giảm xuống 700 nghìn",
    "đổi sang bạc",
    "rẻ hơn",
    "mẫu thứ hai",
    "hiện đại",
    "bỏ chất liệu",
    "1 carat",
    "giữ nguyên ngân sách",
  ])
    check(
      classifyAdvisorMessage(message).kind === "continue",
      `preserves a shopping follow-up: ${message}`,
    );
  for (const message of [
    "Thời tiết hôm nay thế nào?",
    "Bạn là ai?",
    "cảm ơn",
    "mua vé máy bay",
    "giá xăng hôm nay",
    "kể chuyện khác đi",
  ])
    check(
      classifyAdvisorMessage(message).kind === "unrelated",
      `does not recycle products for unrelated text: ${message}`,
    );
  await Product.create({
    name: "Nhẫn bạc ngữ cảnh cũ",
    slug: "reset-ring",
    category: "Nhẫn",
    material: "Bạc 925",
    stone: "Không đính đá",
    style: "Tối giản",
    price: 500000,
    stock: 10,
    sizes: ["12"],
    images: ["/placeholder.svg"],
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function api(message, conversationId, extra = {}, status = 200) {
    const response = await fetch(`${origin}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId, ...extra }),
    });
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  }
  const initial = await api(
    "Nhẫn bạc dưới 1 triệu, phong cách tối giản",
    undefined,
    { weights: { price: 100 } },
  );
  check(
    initial.products.length === 1 &&
      initial.intent.budgetMax === 1000000 &&
      initial.intent.weights,
    "fixture contains prior products, criteria and manual weights",
  );
  const before = await AdvisorSession.findOne({
    sessionId: initial.conversationId,
  }).lean();
  for (const message of [
    "hi",
    "HELLO!!! 👋",
    "xin chào",
    "bắt đầu lại",
    "Thời tiết hôm nay thế nào?",
    "cảm ơn",
  ]) {
    const next = await api(message, initial.conversationId, {
      weights: { price: 100 },
    });
    check(
      next.conversationId === initial.conversationId &&
        !next.conversationReset &&
        JSON.stringify(next.intent) === JSON.stringify(initial.intent) &&
        !next.products.length &&
        !next.diamonds.length &&
        !next.missingCriteria.length,
      `server preserves the conversation and criteria: ${message}`,
    );
    const stored = await AdvisorSession.findOne({
      sessionId: next.conversationId,
    }).lean();
    assert.ok(stored.turns.length > before.turns.length);
    assert.deepEqual(stored.intent, before.intent);
  }
  check(
    JSON.stringify(
      (
        await AdvisorSession.findOne({
          sessionId: initial.conversationId,
        }).lean()
      ).intent,
    ) === JSON.stringify(before.intent),
    "small talk leaves saved criteria intact",
  );
  const changed = await api("Giảm xuống 700 nghìn", initial.conversationId);
  check(
    changed.conversationId === initial.conversationId &&
      changed.intent.category === "Nhẫn" &&
      changed.intent.material === "Bạc 925" &&
      changed.intent.budgetMax === 700000 &&
      !changed.conversationReset,
    "real follow-ups retain prior context and update only the requested criterion",
  );
  const diamond = await AdvisorSession.create({
    sessionId: randomUUID(),
    user: null,
    mode: "diamond",
    intent: { targetCarat: 1, budgetMax: 50000000, weights: { carat: 1 } },
    turns: [{ role: "assistant", text: "Old diamond response" }],
    expiresAt: new Date(Date.now() + 86400000),
  });
  const diamondReset = await api("hello", diamond.sessionId);
  check(
    diamondReset.conversationId === diamond.sessionId &&
      diamondReset.mode === "diamond" &&
      diamondReset.intent.targetCarat === 1 &&
      diamondReset.intent.weights &&
      !diamondReset.diamonds.length,
    "greetings preserve diamond mode, carat and weights",
  );
  await api("hello", randomUUID(), {}, 404);

  const prompts = [];
  process.env.GEMINI_API_KEY = "isolated-mock-key";
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://generativelanguage.googleapis.com/")) {
      prompts.push(JSON.parse(options.body).contents[0].parts[0].text);
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "{}" }] } }],
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(url, options);
  };
  await api("hi", initial.conversationId);
  check(
    prompts.length === 0,
    "bare greetings bypass the model and old recommendation pipeline",
  );
  const newRequest = await api(
    "Hello MIRA, tôi muốn bông tai ngọc trai",
    initial.conversationId,
    { weights: { price: 100 } },
  );
  const context = JSON.parse(
    prompts[0].match(/Ngữ cảnh: (\{.*\})\. Tin nhắn cuối:/s)[1],
  );
  check(
    newRequest.intent.category === "Bông tai" &&
      newRequest.intent.stone === "Ngọc trai" &&
      newRequest.conversationId === initial.conversationId &&
      newRequest.intent.material === "Bạc 925" &&
      newRequest.intent.budgetMax === 700000 &&
      newRequest.intent.weights &&
      context.criteria.budgetMax === 700000 &&
      context.turns.length > 0,
    "greeting plus a shopping request retains the same session and model context",
  );
  globalThis.fetch = originalFetch;
  process.env.GEMINI_API_KEY = "";

  process.env.API_PROXY_TARGET = origin;
  vite = await createServer({
    configFile: path.join(root, "scr/client/vite.config.ts"),
    root: path.join(root, "scr/client"),
    server: { host: "127.0.0.1", port: 0 },
  });
  await vite.listen();
  const web = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const browserContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await browserContext.newPage();
  const requests = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/assistant") && request.method() === "POST")
      requests.push(request.postDataJSON());
  });
  await page.goto(`${web}/advisor`);
  const input = page.getByLabel("Nhu cầu tư vấn trang sức");
  async function send(text) {
    await input.fill(text);
    await page
      .getByRole("button", { name: "GỬI NHU CẦU", exact: true })
      .click();
  }
  await send("Nhẫn bạc dưới 1 triệu");
  await expect(page.locator(".smart-products article")).toHaveCount(1);
  const firstId = requests.at(-1).conversationId;
  await page.getByLabel("Tự điều chỉnh trọng số trang sức").check();
  await page.getByRole("button", { name: "Hỏi MIRA", exact: true }).click();
  const panel = page.locator(".mira-ai-panel");
  await expect(panel.locator(".mira-chat-product-card")).toHaveCount(1);
  await panel.locator("form input").fill("hi");
  await panel.getByRole("button", { name: "Gửi", exact: true }).click();
  await expect(panel.locator(".mira-ai-messages")).toContainText(
    "Bạn muốn mình hỗ trợ thêm",
  );
  await expect(panel.locator(".mira-chat-product-card")).toHaveCount(1);
  await expect(page.locator(".smart-products article")).toHaveCount(0);
  await expect(page.locator(".advisor-criteria")).toContainText("1.000.000");
  await expect(
    page.getByLabel("Tự điều chỉnh trọng số trang sức"),
  ).toBeChecked();
  check(
    requests.at(-1).conversationId !== firstId &&
      requests.at(-1).conversationId &&
      requests.at(-1).weights === undefined,
    "floating greeting submits the existing session and preserves both histories and criteria",
  );
  const activeId = requests.at(-1).conversationId;
  await panel.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.reload();
  await expect(page.locator(".smart-products article")).toHaveCount(0);
  await expect(page.locator(".advisor-history")).toContainText(
    "Nhẫn bạc dưới 1 triệu",
  );
  await send("rẻ hơn");
  assert.equal(requests.at(-1).conversationId, activeId);
  await expect(page.locator(".smart-products article")).toHaveCount(1);
  check(
    true,
    "reload preserves history and follow-ups use the same conversation",
  );
  await page.route("**/api/assistant", (route) =>
    route.fulfill({ status: 500, json: { message: "Test send failure" } }),
  );
  await send("hello");
  await expect(page.getByRole("alert")).toContainText("Test send failure");
  await expect(page.locator(".smart-products article")).toHaveCount(1);
  await expect(page.locator(".advisor-criteria")).toHaveCount(1);
  await expect(page.locator(".advisor-history")).toContainText(
    "Nhẫn bạc dưới 1 triệu",
  );
  check(true, "failed sends preserve the conversation, history and results");
  await page.unroute("**/api/assistant");
  await page.setViewportSize({ width: 390, height: 844 });
  await send("hello");
  await expect(page.locator(".advisor-history")).toContainText(
    "Bạn muốn mình hỗ trợ thêm",
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "retained conversation UI fits mobile",
  );
  // The visible history must survive more than the previous 25-message cap.
  for (let index = 0; index < 13; index++) {
    await send("hi");
    await expect(
      page.getByRole("button", { name: "Hội thoại mới", exact: true }),
    ).toBeEnabled();
  }
  await expect(page.locator(".advisor-history")).toContainText(
    "Nhẫn bạc dưới 1 triệu",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mira_advisor:guest")),
  );
  check(
    saved.messages.length > 25 && saved.conversationId === activeId,
    "long history remains saved without truncation or automatic session changes",
  );
  const reopened = await page.context().newPage();
  await reopened.goto(`${web}/advisor`);
  await expect(reopened.locator(".advisor-history")).toContainText(
    "Nhẫn bạc dưới 1 triệu",
  );
  await reopened.close();
  await page
    .getByRole("button", { name: "Hội thoại mới", exact: true })
    .click();
  await expect(page.locator(".advisor-history article")).toHaveCount(1);
  await expect(page.locator(".advisor-criteria")).toHaveCount(0);
  await send("Bông tai ngọc trai");
  assert.equal(requests.at(-1).conversationId, undefined);
  await expect(page.locator(".advisor-history")).toContainText(
    "Ngân sách tối đa",
  );
  await expect(page.locator(".advisor-history")).not.toContainText(
    "Nhẫn bạc dưới 1 triệu",
  );
  check(
    true,
    "only the New conversation button clears context; the next request starts fresh",
  );
  console.log(`Advisor reset: ${checks} checks passed.`);
} finally {
  globalThis.fetch = originalFetch;
  await browser?.close();
  await vite?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  await mongo?.stop();
}
