import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

// This suite imports the app directly and never loads the development .env.
process.env.JWT_SECRET = "isolated-decision-support-test-secret-2026";
process.env.GEMINI_API_KEY = "";
process.env.MONGO_URI = "";
const root = fileURLToPath(new URL("../../", import.meta.url));
let mongo,
  server,
  vite,
  browser,
  count = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  count++;
  console.log(`PASS ${label}`);
};
let base;
async function api(
  endpoint,
  { method = "GET", body, token, status = 200 } = {},
) {
  const response = await fetch(base + endpoint, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${endpoint}: ${JSON.stringify(result)}`,
  );
  return result;
}
try {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { default: app } = await import("../server/dist/app.js");
  const { default: Product } = await import("../server/dist/models/Product.js");
  const { default: Diamond } = await import("../server/dist/models/Diamond.js");
  const { default: User } = await import("../server/dist/models/User.js");
  const { default: Order } = await import("../server/dist/models/Order.js");
  const { default: Behavior } =
    await import("../server/dist/models/Behavior.js");
  const { default: AdvisorSession } =
    await import("../server/dist/models/AdvisorSession.js");
  const { recordPurchase } =
    await import("../server/dist/services/behavior.service.js");
  await Promise.all([Behavior.init(), AdvisorSession.init()]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  base = `${origin}/api`;
  const credentials = {
    name: "Customer One",
    email: "one@decision.test",
    password: "Testing123!",
  };
  const first = await api("/auth/register", {
    method: "POST",
    body: credentials,
    status: 201,
  });
  const second = await api("/auth/register", {
    method: "POST",
    body: { ...credentials, name: "Customer Two", email: "two@decision.test" },
    status: 201,
  });
  const adminCredentials = { ...credentials, email: "admin@decision.test" };
  await api("/auth/register", {
    method: "POST",
    body: adminCredentials,
    status: 201,
  });
  await User.updateOne(
    { email: adminCredentials.email },
    { $set: { role: "admin" } },
  );
  const admin = await api("/auth/login", {
    method: "POST",
    body: adminCredentials,
  });
  const products = await Product.create([
    {
      name: "Nhẫn Bạc Tối Giản",
      slug: "test-silver-minimal",
      category: "Nhẫn",
      material: "Bạc 925",
      price: 600000,
      stock: 12,
      sizes: ["12"],
      stone: "Không đính đá",
      style: "Tối giản",
      occasion: ["Sinh nhật"],
      rating: 1,
      images: ["/placeholder.svg"],
    },
    {
      name: "Nhẫn Bạc Cổ Điển",
      slug: "test-silver-classic",
      category: "Nhẫn",
      material: "Bạc 925",
      price: 600000,
      stock: 12,
      stone: "Không đính đá",
      style: "Cổ điển",
      occasion: ["Kỷ niệm"],
      rating: 5,
      images: ["/placeholder.svg"],
    },
    {
      name: "Nhẫn Bạc Kim Cương",
      slug: "test-silver-diamond",
      category: "Nhẫn",
      material: "Bạc 925",
      price: 900000,
      stock: 12,
      stone: "Kim cương",
      style: "Hiện đại",
      occasion: ["Cầu hôn"],
      rating: 4,
      images: ["/placeholder.svg"],
    },
    {
      name: "Nhẫn Hết Hàng",
      slug: "test-out-of-stock",
      category: "Nhẫn",
      material: "Bạc 925",
      price: 200000,
      stock: 0,
      stone: "Không đính đá",
      images: [],
    },
  ]);
  await Diamond.create([
    {
      code: "CUT-BEST",
      carat: 0.8,
      cut: "Excellent",
      color: "J",
      clarity: "SI1",
      price: 40000000,
    },
    {
      code: "CARAT-BEST",
      carat: 1,
      cut: "Good",
      color: "D",
      clarity: "VVS1",
      price: 45000000,
    },
    {
      code: "EXPENSIVE",
      carat: 2,
      cut: "Excellent",
      color: "D",
      clarity: "FL",
      price: 200000000,
    },
  ]);

  await api("/customers", { status: 401 });
  await api("/customers", { token: first.token, status: 403 });
  const customers = await api("/customers?search=one%40decision.test", {
    token: admin.token,
  });
  check(
    customers.total === 1 &&
      !customers.customers[0].password &&
      !customers.customers[0].addresses,
    "customer administration requires admin and hides credentials/address books",
  );
  check(
    (await api("/customers?search=%2E%2A", { token: admin.token })).total === 0,
    "customer search treats regex characters literally",
  );
  await api(`/customers/${admin.user.id}`, { token: admin.token, status: 404 });
  await api(`/customers/${first.user.id}`, {
    method: "PATCH",
    token: admin.token,
    body: {
      name: "Updated Customer",
      phone: "0901234567",
      role: "admin",
      password: "injected",
    },
  });
  check(
    (await User.findById(first.user.id)).role === "customer" &&
      (await api(`/customers/${first.user.id}`, { token: admin.token }))
        .customer.name === "Updated Customer",
    "customer edits whitelist name and phone without role escalation",
  );

  const incomplete = await api("/assistant", {
    method: "POST",
    body: { message: "Tôi muốn mua quà" },
  });
  check(
    incomplete.missingCriteria.includes("category") &&
      incomplete.missingCriteria.includes("budgetMax") &&
      !incomplete.products.length,
    "advisor asks for missing category and budget before ranking",
  );
  const initial = await api("/assistant", {
    method: "POST",
    body: {
      conversationId: incomplete.conversationId,
      message: "Nhẫn bạc dưới 1 triệu, phong cách tối giản",
    },
  });
  check(
    initial.products.length === 3 && initial.intent.material === "Bạc 925",
    "guest multi-turn conversation merges criteria and excludes out-of-stock products",
  );
  const changed = await api("/assistant", {
    method: "POST",
    body: {
      conversationId: initial.conversationId,
      message: "Giảm xuống 700 nghìn",
    },
  });
  check(
    changed.intent.category === "Nhẫn" &&
      changed.intent.material === "Bạc 925" &&
      changed.intent.budgetMax === 700000 &&
      changed.products.length === 2,
    "budget follow-up preserves category, material and style",
  );
  const occasion = await api("/assistant", {
    method: "POST",
    body: {
      conversationId: initial.conversationId,
      message: "Tặng sinh nhật",
      weights: { occasion: 100 },
    },
  });
  check(
    occasion.products[0].name === "Nhẫn Bạc Tối Giản" &&
      occasion.products[0].weights.occasion === 1,
    "occasion and custom weights affect ranking",
  );
  const rating = await api("/assistant", {
    method: "POST",
    body: {
      conversationId: initial.conversationId,
      message: "Ưu tiên đánh giá",
      weights: { rating: 100 },
    },
  });
  check(
    rating.products[0].name === "Nhẫn Bạc Cổ Điển" &&
      rating.products[0].score === 100,
    "changing weights changes Top-K order using DSS alone",
  );
  check(
    rating.products.every(
      (p) =>
        Math.abs(
          p.scoreParts.reduce((sum, part) => sum + part.contribution, 0) -
            p.score,
        ) <= 0.5 &&
        Math.abs(
          Object.values(p.weights).reduce((sum, value) => sum + value, 0) - 1,
        ) < 1e-10,
    ),
    "DSS contributions reproduce scores and normalized weights sum to one",
  );
  const automatic = await api("/assistant", {
    method: "POST",
    body: {
      conversationId: initial.conversationId,
      message: "Ngân sách 1 triệu",
      weights: null,
    },
  });
  check(
    automatic.products[0].weights.rating < 1 && !automatic.intent.weights,
    "automatic context weights can be restored after manual adjustment",
  );
  for (const weights of [{ rating: -1 }, { rating: 0 }, { rating: "invalid" }])
    await api("/assistant", {
      method: "POST",
      body: { message: "Nhẫn dưới 1 triệu", weights },
      status: 400,
    });
  await api("/assistant", {
    method: "POST",
    body: { message: "hello", conversationId: randomUUID() },
    status: 404,
  });
  const personal = await api("/assistant", {
    method: "POST",
    token: first.token,
    body: { message: "Nhẫn bạc dưới 1 triệu" },
  });
  await api("/assistant", {
    method: "POST",
    token: second.token,
    body: { message: "500 nghìn", conversationId: personal.conversationId },
    status: 404,
  });
  await api("/assistant", {
    method: "POST",
    body: { message: "500 nghìn", conversationId: personal.conversationId },
    status: 404,
  });
  check(true, "conversation ownership blocks other customers and guests");
  const stone = await api("/assistant", {
    method: "POST",
    token: first.token,
    body: {
      message: "Không chọn kim cương",
      conversationId: personal.conversationId,
    },
  });
  check(
    stone.products.every((p) => p.stone !== "Kim cương") &&
      stone.intent.excludeStone === "Kim cương",
    "stone exclusions persist without contradicting positive criteria",
  );
  const withDiamond = await api("/assistant", {
    method: "POST",
    token: first.token,
    body: {
      message: "Có đính kim cương",
      conversationId: personal.conversationId,
    },
  });
  check(
    withDiamond.mode === "advisor" &&
      withDiamond.intent.category === "Nhẫn" &&
      withDiamond.products.length === 1,
    "adding diamond stones to a ring keeps jewelry mode and clears the previous exclusion",
  );
  const clearMaterial = await api("/assistant", {
    method: "POST",
    token: first.token,
    body: { message: "Bỏ chất liệu", conversationId: personal.conversationId },
  });
  check(
    !clearMaterial.intent.material && clearMaterial.intent.category === "Nhẫn",
    "users can remove an optional criterion while retaining the rest of the conversation",
  );

  const diamondAsk = await api("/assistant", {
    method: "POST",
    body: { message: "Tư vấn kim cương dưới 50 triệu" },
  });
  check(
    diamondAsk.missingCriteria.includes("targetCarat"),
    "diamond conversation asks for missing carat",
  );
  const diamondReply = await api("/assistant", {
    method: "POST",
    body: {
      conversationId: diamondAsk.conversationId,
      message: "1 carat, ưu tiên giác cắt",
    },
  });
  check(
    diamondReply.mode === "diamond" &&
      diamondReply.diamonds.length === 2 &&
      diamondReply.diamonds[0].weights.cut > 0.5,
    "diamond follow-up keeps budget and adjusts 4Cs priority",
  );
  const reduced = await api("/assistant", {
    method: "POST",
    body: {
      conversationId: diamondAsk.conversationId,
      message: "Chỉ dưới 42 triệu",
    },
  });
  check(
    reduced.intent.budgetMax === 42000000 &&
      reduced.intent.targetCarat === 1 &&
      reduced.diamonds.length === 1,
    "diamond budget correction overrides prior budget while preserving carat",
  );
  const ranked = await api("/diamonds/rank", {
    method: "POST",
    body: {
      budgetMax: 50000000,
      targetCarat: 1,
      weights: { carat: 1, cut: 0, color: 0, clarity: 0 },
      limit: 1,
    },
  });
  check(
    ranked.length === 1 && ranked[0].code === "CARAT-BEST",
    "diamond API applies custom 4Cs weights and Top-K limit",
  );
  check(
    (await api(`/diamonds/${ranked[0]._id}`)).code === "CARAT-BEST",
    "diamond suggestions resolve to their own persisted detail record",
  );
  await api("/diamonds/rank", {
    method: "POST",
    body: { weights: { carat: -1 } },
    status: 400,
  });

  const eventId = randomUUID();
  for (const type of ["VIEW", "CLICK", "ADD_CART", "WISHLIST"])
    await api("/behaviors", {
      method: "POST",
      token: first.token,
      body: {
        type,
        product: String(products[0]._id),
        eventId: type === "VIEW" ? eventId : randomUUID(),
      },
      status: 201,
    });
  await api("/behaviors", {
    method: "POST",
    token: first.token,
    body: { type: "VIEW", product: String(products[0]._id), eventId },
    status: 201,
  });
  check(
    (await Behavior.countDocuments({ user: first.user.id, type: "VIEW" })) ===
      1,
    "behavior event IDs prevent duplicate tracking",
  );
  await api("/behaviors", {
    method: "POST",
    token: first.token,
    body: { type: "SEARCH", query: "Nhẫn bạc tối giản dưới 1 triệu" },
    status: 201,
  });
  await api("/behaviors", {
    method: "POST",
    token: first.token,
    body: { type: "PURCHASE", product: String(products[0]._id) },
    status: 400,
  });
  const order = await Order.create({
    user: first.user.id,
    orderCode: "DSS-PURCHASE",
    status: "shipping",
    paymentMethod: "COD",
    total: 600000,
    items: [{ product: products[0]._id, quantity: 1 }],
  });
  await api(`/orders/${order._id}/status`, {
    method: "PATCH",
    token: admin.token,
    body: { status: "completed" },
  });
  await recordPurchase(await Order.findById(order._id));
  const preference = await api("/behaviors/preference", { token: first.token });
  check(
    (await Behavior.countDocuments({
      user: first.user.id,
      type: "PURCHASE",
    })) === 1 &&
      preference.categories["Nhẫn"] >= 22 &&
      preference.materials["Bạc 925"] >= 22,
    "completed purchase is recorded once and all six behavior types update preferences",
  );
  const customerStats = await api(
    `/customers?search=${encodeURIComponent(credentials.email)}`,
    { token: admin.token },
  );
  check(
    customerStats.customers[0].spent === 600000 &&
      customerStats.customers[0].orders === 1,
    "customer statistics and order history use persisted purchases",
  );

  const originalFetch = globalThis.fetch;
  const prompts = [];
  process.env.GEMINI_API_KEY = "mock-key-for-protocol-test";
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://generativelanguage.googleapis.com/")) {
      const body = JSON.parse(options.body);
      prompts.push(body.contents[0].parts[0].text);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: body.generationConfig
                      ? JSON.stringify({ style: "Tối giản" })
                      : "Giải thích từ điểm DSS đã cung cấp.",
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(url, options);
  };
  try {
    await api("/assistant", {
      method: "POST",
      body: {
        conversationId: initial.conversationId,
        message: "Giữ nguyên ngân sách, đổi phong cách",
      },
    });
    check(
      prompts[0].includes("Ngữ cảnh:") &&
        prompts[0].includes("Nhẫn") &&
        prompts.some(
          (prompt) =>
            prompt.includes("scoreParts") && prompt.includes("weights"),
        ),
      "Gemini receives prior conversation criteria and DSS component scores for grounded explanations",
    );
    globalThis.fetch = async (url, options) =>
      String(url).startsWith("https://generativelanguage.googleapis.com/")
        ? new Response("quota", { status: 429 })
        : originalFetch(url, options);
    const fallback = await api("/assistant", {
      method: "POST",
      body: { message: "Nhẫn bạc dưới 1 triệu" },
    });
    check(
      fallback.products.length === 3 && fallback.answer.includes("DSS"),
      "Gemini failures retain local extraction and deterministic DSS explanation",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = "";
  }

  vite = await createServer({
    configFile: path.join(root, "scr/client/vite.config.ts"),
    root: path.join(root, "scr/client"),
    server: { host: "127.0.0.1", port: 5197, proxy: { "/api": origin } },
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
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("mira_token", token);
    localStorage.setItem("mira_user", JSON.stringify(user));
  }, admin);
  await page.goto(`${web}admin`);
  await page.getByRole("button", { name: "Khách hàng", exact: true }).click();
  await page.getByLabel("Tìm khách hàng").fill(credentials.email);
  await expect(page.locator(".customer-management tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Xem / sửa" }).click();
  await page
    .getByLabel("Họ tên", { exact: true })
    .fill("Browser Updated Customer");
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(page.getByText("Đã lưu thông tin khách hàng.")).toBeVisible();
  await expect(page.getByText("DSS-PURCHASE", { exact: true })).toBeVisible();
  await fs.mkdir(path.join(root, "scr/test-data/results"), { recursive: true });
  await page.screenshot({
    path: path.join(root, "scr/test-data/results/customers-desktop.png"),
    fullPage: true,
  });
  check(
    true,
    "admin browser flow searches customers, edits profile and displays order history",
  );
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("mira_token", token);
    localStorage.setItem("mira_user", JSON.stringify(user));
    localStorage.removeItem("mira_wishlist");
  }, first);
  const tracked = (type) =>
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/behaviors") &&
        response.request().method() === "POST" &&
        response.request().postDataJSON()?.type === type &&
        response.status() === 201,
    );
  await Promise.all([
    tracked("SEARCH"),
    page.goto(`${web}products?search=Nh%E1%BA%ABn`),
  ]);
  await Promise.all([
    tracked("WISHLIST"),
    page
      .getByRole("button", { name: "Yêu thích Nhẫn Bạc Tối Giản", exact: true })
      .click(),
  ]);
  await Promise.all([
    tracked("CLICK"),
    tracked("VIEW"),
    page
      .locator('.shop-card a[href="/product/test-silver-minimal"]')
      .first()
      .click(),
  ]);
  await Promise.all([
    tracked("ADD_CART"),
    page
      .getByRole("button", { name: "THÊM VÀO GIỎ HÀNG", exact: true })
      .click(),
  ]);
  check(
    true,
    "real catalog and product interactions record SEARCH, WISHLIST, CLICK, VIEW and ADD_CART",
  );
  await page.evaluate(() => {
    localStorage.removeItem("mira_token");
    localStorage.removeItem("mira_user");
    sessionStorage.clear();
  });
  await page.goto(`${web}advisor`);
  await page
    .getByLabel("Nhu cầu tư vấn trang sức")
    .fill("Nhẫn bạc dưới 1 triệu");
  await page.getByRole("button", { name: "GỬI NHU CẦU", exact: true }).click();
  await expect(page.locator(".smart-products article")).toHaveCount(3);
  await page
    .getByLabel("Nhu cầu tư vấn trang sức")
    .fill("Giảm xuống 700 nghìn");
  await page.getByRole("button", { name: "GỬI NHU CẦU", exact: true }).click();
  await expect(page.locator(".smart-products article")).toHaveCount(2);
  await page.locator(".comparison-choices input").nth(0).check();
  await page.locator(".comparison-choices input").nth(1).check();
  await expect(page.locator(".product-comparison table")).toBeVisible();
  await expect(page.locator(".advisor-criteria")).toContainText("700.000");
  await page.screenshot({
    path: path.join(
      root,
      "scr/test-data/results/advisor-comparison-desktop.png",
    ),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".advisor-history")).toContainText(
    "Giảm xuống 700 nghìn",
  );
  check(
    true,
    "advisor browser keeps follow-up criteria after reload and compares real DSS results",
  );
  await page.getByRole("button", { name: "Hỏi MIRA" }).click();
  await expect(page.locator(".mira-ai-messages")).toContainText(
    "Giảm xuống 700 nghìn",
  );
  await page
    .locator(".mira-ai-panel")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  check(true, "floating chat and advisor page share conversation context");
  await page.getByLabel("Tự điều chỉnh trọng số trang sức").check();
  await expect(
    page.getByRole("slider", { name: "Trọng số Ngân sách", exact: true }),
  ).toBeVisible();
  await page.goto(`${web}diamond-dss`);
  await page
    .getByText("Ngân sách tối đa", { exact: true })
    .locator("input")
    .fill("50000000");
  await page.getByRole("button", { name: "XẾP HẠNG", exact: true }).click();
  await expect(page.locator(".diamond-table article")).toHaveCount(2);
  await page.locator(".comparison-choices input").nth(0).check();
  await page.locator(".comparison-choices input").nth(1).check();
  await expect(page.locator(".product-comparison table")).toContainText(
    "Độ tinh khiết",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "4Cs comparison scrolls inside its table without mobile page overflow",
  );
  await fs.mkdir(path.join(root, "scr/test-data/results"), { recursive: true });
  await page.screenshot({
    path: path.join(root, "scr/test-data/results/decision-support-mobile.png"),
    fullPage: true,
  });
  await page
    .locator(".diamond-table article")
    .first()
    .getByRole("link", { name: "Xem chi tiết →" })
    .click();
  await expect(page.locator(".diamond-detail")).toContainText("Độ tinh khiết");
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "suggested diamonds open a responsive detail page",
  );
  check(
    errors.length === 0,
    `new browser flows have no JavaScript errors: ${errors.join("; ")}`,
  );
  console.log(`\n${count} decision-support checks passed.`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}
