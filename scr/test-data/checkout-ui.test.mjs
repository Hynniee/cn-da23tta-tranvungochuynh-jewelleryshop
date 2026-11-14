import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

// All API responses and QR images are local browser fixtures. No orders,
// payments, messages or inventory changes reach the configured database.
const base = process.env.UI_TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const product = {
  _id: "507f1f77bcf86cd799439011",
  name: "Nhẫn bạc Flora",
  slug: "nhan-bac-flora",
  category: "Nhẫn",
  material: "Bạc 925",
  stone: "Đá CZ",
  price: 650000,
  stock: 8,
  images: ["/editorial/rings.jpg"],
  sizes: ["12"],
  featured: true,
};
const optionsProduct = {
  ...product,
  _id: "507f1f77bcf86cd799439012",
  name: "Nhẫn vàng Muse",
  slug: "nhan-vang-muse",
  material: "Vàng 18K",
  sizes: ["12", "14"],
  price: 5600000,
  images: ["/editorial/hero.jpg"],
};
const products = [
  product,
  optionsProduct,
  {
    ...product,
    _id: "507f1f77bcf86cd799439013",
    slug: "nhan-het-hang",
    name: "Nhẫn tạm hết hàng",
    stock: 0,
  },
];
const user = {
  name: "Khách hàng kiểm thử",
  email: "fixture@example.com",
  phone: "0901234567",
  role: "admin",
};
const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 30 30"><rect width="30" height="30" fill="white"/><path fill="#222" d="M2 2h7v7H2zm19 0h7v7h-7zM2 21h7v7H2zm10-9h4v4h-4zm6 7h3v3h-3zm5 5h5v4h-5zm-12-5h3v9h-3zm12-8h5v4h-5zm-6-7h2v7h-2z"/><path fill="white" d="M3 3h5v5H3zm19 0h5v5h-5zM3 22h5v5H3z"/><path fill="#222" d="M4 4h3v3H4zm19 0h3v3h-3zM4 23h3v3H4z"/></svg>`;
let qrFails = false;
let paymentStatus = "UNPAID";
let paymentOrderStatus = "pending_payment";
let paymentRequests = 0;
let statusRequests = 0;
let statusFails = false;
let ordersFail = false;
const fixtureOrder = {
  _id: "fixture-order",
  orderCode: "MIRA20261113TEST",
  createdAt: "2026-11-13T08:00:00Z",
  status: "pending_payment",
  paymentMethod: "BANK_QR",
  paymentStatus: "PENDING",
  subtotal: 650000,
  shippingFee: 30000,
  total: 680000,
  items: [
    {
      name: product.name,
      price: product.price,
      quantity: 1,
      size: "14",
      image: product.images[0],
    },
  ],
  customer: {
    name: user.name,
    phone: user.phone,
    address: "123 Nguyễn Trãi, Thành phố Hồ Chí Minh",
  },
};
const writes = [];
const orderRequests = [];
let orderFails = false;
await page.route("**/fixture-qr.svg", (route) =>
  qrFails
    ? route.abort()
    : route.fulfill({ contentType: "image/svg+xml", body: qrSvg }),
);
await page.route("**/api/**", async (route) => {
  const req = route.request(),
    path = new URL(req.url()).pathname;
  if (req.method() !== "GET") writes.push(path);
  let json;
  if (path === "/api/orders" && req.method() === "POST") {
    orderRequests.push(req.postDataJSON());
    if (orderFails)
      return route.fulfill({
        status: 400,
        json: { message: "Thông tin đơn hàng không hợp lệ" },
      });
    return route.fulfill({ status: 201, json: fixtureOrder });
  } else if (path === "/api/products") json = products;
  else if (path === "/api/auth/me") json = user;
  else if (path === "/api/auth/me/addresses") json = [];
  else if (path === "/api/products/write-status") json = { ok: true };
  else if (path === "/api/payments/options")
    json = { bankTransferAvailable: true };
  else if (path.startsWith("/api/payments/create/")) {
    paymentRequests++;
    json = {
      orderId: "fixture-order",
      qrUrl: `${base}/fixture-qr.svg`,
      amount: 680000,
      transferContent: "MIRA20261113TEST",
      payment: { orderCode: "MIRA20261113TEST", status: "PENDING" },
      bankName: "Ngân hàng kiểm thử",
      accountNo: "0000000000000",
      accountName: "MIRA KIEM THU",
    };
  } else if (path.startsWith("/api/payments/order/")) {
    statusRequests++;
    if (statusFails)
      return route.fulfill({
        status: 400,
        json: { message: "Không thể kết nối để xác nhận giao dịch." },
      });
    json = {
      orderCode: "MIRA20261113TEST",
      paymentStatus,
      status: paymentOrderStatus,
    };
  } else if (path === "/api/promotions/quote") {
    const items = req.postDataJSON().items.map((item) => ({
      ...item,
      price:
        products.find((p) => p._id === item.product)?.price || product.price,
    }));
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    json = {
      items,
      subtotal,
      shippingFee: 30000,
      discountTotal: 0,
      total: subtotal + 30000,
      voucher: null,
    };
  } else if (path.endsWith("/reviews"))
    json = {
      reviews: [],
      total: 0,
      average: 0,
      page: 1,
      pages: 1,
      canReview: false,
      hasReviewed: false,
    };
  else if (path.startsWith("/api/products/"))
    json = products.find((p) => path.endsWith(p.slug)) || product;
  else if (path === "/api/recommendations")
    json = { products: products.slice(0, 2).map((p) => ({ ...p, score: 91 })) };
  else if (path === "/api/orders/mine") {
    if (ordersFail)
      return route.fulfill({
        status: 400,
        json: { message: "Chưa tải được đơn hàng." },
      });
    json = [
      {
        ...fixtureOrder,
        _id: "another-order",
        orderCode: "MIRA-OTHER-ORDER",
        status: "completed",
        paymentStatus: "PAID",
      },
      { ...fixtureOrder, status: paymentOrderStatus, paymentStatus },
    ];
  } else if (path.startsWith("/api/orders/") && req.method() === "GET") {
    json = { ...fixtureOrder, status: paymentOrderStatus, paymentStatus };
  } else if (["/api/orders", "/api/promotions"].includes(path)) json = [];
  else if (path.endsWith("/wards"))
    json = [{ code: "25747", name: "Phường Thủ Dầu Một" }];
  else if (path.includes("/locations/"))
    json = [{ code: "79", name: "Thành phố Hồ Chí Minh" }];
  else if (path.includes("/appointments/salons")) json = [];
  else json = {};
  await route.fulfill({ json });
});
await page.addInitScript(
  ({ product, user }) => {
    localStorage.setItem("mira_token", "browser-fixture-only");
    localStorage.setItem("mira_user", JSON.stringify(user));
    if (!sessionStorage.getItem("fixture-cart")) {
      localStorage.setItem(
        "mira_cart",
        JSON.stringify([
          {
            ...product,
            image: product.images[0],
            quantity: 1,
            size: "12",
          },
        ]),
      );
      sessionStorage.setItem("fixture-cart", "1");
    }
  },
  { product, user },
);
await fs.mkdir("scr/test-data/results/system-ui", { recursive: true });
async function fits(label) {
  const bounds = await page.evaluate(() => ({
    view: innerWidth,
    doc: document.documentElement.scrollWidth,
    bad: [...document.querySelectorAll("main *")]
      .filter(
        (el) =>
          el.getBoundingClientRect().right > innerWidth + 2 &&
          el.clientWidth > 0,
      )
      .slice(0, 5)
      .map((el) => el.className),
  }));
  assert.ok(
    bounds.doc <= bounds.view + 1,
    `${label}: ${JSON.stringify(bounds)}`,
  );
}
try {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${base}/checkout?order=fixture-order`);
    await expect(
      page.getByRole("heading", { name: "Hoàn tất thanh toán" }),
    ).toBeVisible();
    await expect(
      page.getByAltText("Mã QR thanh toán đơn MIRA20261113TEST"),
    ).toBeVisible();
    await expect(page.locator(".transfer-qr-frame")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await fits(`QR ${width}`);
    const rects = await page.evaluate(() =>
      [
        ".transfer-heading",
        ".transfer-card",
        ".transfer-qr-frame",
        ".transfer-details",
      ].map((sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { x: r.x, y: r.y, bottom: r.bottom, right: r.right };
      }),
    );
    assert.ok(
      rects[0].bottom <= rects[1].y,
      "QR heading does not overlap the card",
    );
    if (width < 761)
      assert.ok(
        rects[2].bottom <= rects[3].y,
        "QR stacks above transfer details on mobile",
      );
    await page.screenshot({
      path: `scr/test-data/results/system-ui/payment-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Sao chép số tài khoản", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    "0000000000000",
  );
  await expect(page.locator(".action-notification")).toContainText(
    "Đã sao chép",
  );
  await page.clock.install();
  const requestsBefore = statusRequests;
  await page
    .getByRole("button", { name: "Tôi đã chuyển khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/thank-you\?order=fixture-order$/);
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn đã chọn MIRA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Xem chi tiết đơn hàng", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\?tab=orders&order=fixture-order$/);
  const dialog = page.getByRole("dialog", {
    name: "Chi tiết đơn hàng",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".order-dialog-heading")).toContainText(
    "MIRA20261113TEST",
  );
  await expect(dialog).not.toContainText("MIRA-OTHER-ORDER");
  await expect(dialog).toContainText(product.name);
  await expect(dialog).toContainText("123 Nguyễn Trãi");
  await expect(dialog.locator(".order-dialog-total")).toContainText("680.000");
  await expect.poll(() => statusRequests).toBeGreaterThan(requestsBefore);
  await expect(dialog.locator(".order-payment-state")).toContainText(
    "Đang chờ xác nhận thanh toán",
  );
  await expect(dialog).toContainText("Trạng thái sẽ tự cập nhật");
  await expect(dialog.locator(".order-payment-state")).not.toContainText(
    "Đã thanh toán",
  );
  await expect(
    dialog.getByRole("button", { name: "Đóng chi tiết đơn hàng", exact: true }),
  ).toBeFocused();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await fits(`Order popup ${width}`);
    const box = await dialog.boundingBox();
    assert.ok(
      box.x >= 0 && box.x + box.width <= width,
      "Order popup stays in viewport",
    );
    await page.screenshot({
      path: `scr/test-data/results/system-ui/order-popup-${width}.png`,
    });
  }
  paymentStatus = "PAID";
  paymentOrderStatus = "confirmed";
  await page.clock.runFor(5000);
  await expect(dialog.locator(".order-payment-state")).toContainText(
    "Đã thanh toán",
  );
  const requestsAfterPaid = statusRequests;
  await page.clock.runFor(15000);
  assert.equal(statusRequests, requestsAfterPaid, "Polling stops once paid");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/account\?tab=orders$/);
  await expect(
    page.getByRole("heading", { name: "Đơn hàng của tôi", exact: true }),
  ).toBeVisible();
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  await page
    .locator(".account-orders tbody tr")
    .filter({ hasText: "MIRA20261113TEST" })
    .getByRole("button", { name: "Xem chi tiết", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".order-dialog-heading")).toContainText(
    "MIRA20261113TEST",
  );
  await dialog
    .getByRole("button", { name: "Đóng chi tiết", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  console.log(
    "PASS transfer redirects to own orders, opens correct order, polls server without marking paid; popup mobile/desktop, Escape, manual reopen and reload",
  );

  qrFails = true;
  paymentStatus = "UNPAID";
  paymentOrderStatus = "pending_payment";
  await page.goto(`${base}/checkout?order=fixture-order`);
  await expect(
    page.getByText("Chưa tải được mã QR", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".transfer-fields")).toContainText("0000000000000");
  qrFails = false;
  await page
    .getByRole("button", { name: "Tải lại mã QR", exact: true })
    .click();
  await expect(page.locator(".transfer-qr-frame")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  paymentOrderStatus = "cancelled";
  await page
    .getByRole("button", { name: "Tôi đã chuyển khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/thank-you\?order=fixture-order$/);
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn đã chọn MIRA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Xem chi tiết đơn hàng", exact: true })
    .click();
  await expect(dialog.locator(".order-payment-state")).toContainText(
    "Đơn hàng đã hủy",
  );
  await expect(dialog).toContainText(
    "Vui lòng chờ chúng tôi rà soát giao dịch và xử lý hoàn tiền",
  );
  const requestsAfterCancelled = statusRequests;
  await page.clock.runFor(15000);
  assert.equal(
    statusRequests,
    requestsAfterCancelled,
    "Polling stops when cancelled",
  );
  console.log(
    "PASS QR image retry and cancelled order is shown in order popup",
  );

  for (const scenario of [
    {
      method: "BANK_QR",
      status: "PAID",
      message: "rà soát giao dịch và xử lý hoàn tiền",
    },
    {
      method: "BANK_QR",
      status: "REFUNDED",
      message: "Khoản thanh toán của đơn hàng đã được hoàn lại",
    },
    {
      method: "COD",
      status: "UNPAID",
      message: "Đơn hàng của bạn đã được hủy",
    },
  ]) {
    fixtureOrder.paymentMethod = scenario.method;
    paymentStatus = scenario.status;
    await page.goto(`${base}/thank-you?order=fixture-order`);
    await expect(page.locator(".thankyou-payment h2")).toHaveText(
      "Đơn hàng đã hủy",
    );
    await expect(page.locator(".thankyou-payment")).toContainText(
      scenario.message,
    );
    await expect(
      page
        .locator(".thankyou-payment")
        .getByRole("link", { name: "liên hệ MIRA", exact: true }),
    ).toHaveAttribute("href", "/support");
    await page
      .getByRole("link", { name: "Xem chi tiết đơn hàng", exact: true })
      .click();
    await expect(dialog.locator(".order-payment-state strong")).toHaveText(
      "Đơn hàng đã hủy",
    );
    await expect(dialog.locator(".order-payment-state")).toContainText(
      scenario.message,
    );
    await expect(
      dialog
        .locator(".order-payment-state")
        .getByRole("link", { name: "liên hệ MIRA", exact: true }),
    ).toHaveAttribute("href", "/support");
  }
  fixtureOrder.paymentMethod = "BANK_QR";
  paymentStatus = "UNPAID";
  console.log(
    "PASS cancelled bank/refunded/COD copy and support links on thank-you and order popup",
  );

  paymentOrderStatus = "pending_payment";
  statusFails = true;
  await page.goto(`${base}/checkout?order=fixture-order`);
  await page
    .getByRole("button", { name: "Tôi đã chuyển khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/thank-you\?order=fixture-order$/);
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn đã chọn MIRA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Xem chi tiết đơn hàng", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Không thể kết nối");
  statusFails = false;
  await dialog
    .getByRole("button", { name: "Thử lại kết nối", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  paymentStatus = "MISMATCH";
  await page.clock.runFor(5000);
  await expect(dialog.locator(".order-payment-state")).toContainText(
    "Cần đối soát giao dịch",
  );
  const requestsAfterMismatch = statusRequests;
  await page.clock.runFor(15000);
  assert.equal(
    statusRequests,
    requestsAfterMismatch,
    "Polling stops for reconciliation",
  );

  paymentStatus = "UNPAID";
  await page.goto(`${base}/checkout?order=fixture-order`);
  await page
    .getByRole("button", { name: "Tôi đã chuyển khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/thank-you\?order=fixture-order$/);
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn đã chọn MIRA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Xem chi tiết đơn hàng", exact: true })
    .click();
  await expect
    .poll(() => statusRequests)
    .toBeGreaterThan(requestsAfterMismatch);
  await dialog
    .getByRole("button", { name: "Đóng chi tiết", exact: true })
    .click();
  const requestsAfterLeaving = statusRequests;
  await page.clock.runFor(15000);
  assert.equal(
    statusRequests,
    requestsAfterLeaving,
    "Polling stops when closing popup",
  );
  await page.goto(`${base}/account?tab=orders&order=unknown-order`);
  await expect(page.getByRole("alert")).toContainText(
    "Không tìm thấy đơn hàng",
  );
  await expect(dialog).toHaveCount(0);
  ordersFail = true;
  await page.goto(`${base}/checkout?order=fixture-order`);
  await page
    .getByRole("button", { name: "Tôi đã chuyển khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/thank-you\?order=fixture-order$/);
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn đã chọn MIRA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Xem chi tiết đơn hàng", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\?tab=orders&order=fixture-order$/);
  await expect(page.getByRole("alert")).toContainText("Chưa tải được đơn hàng");
  ordersFail = false;
  await page
    .getByRole("button", { name: "Tải lại đơn hàng", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Đóng chi tiết", exact: true })
    .click();
  assert.ok(
    !writes.some((path) => path.startsWith("/api/payments/order/")),
    "Acknowledging transfer only reads payment status",
  );
  console.log(
    "PASS order loading retry, unknown order, reconciliation, payment connection retry and polling cleanup",
  );

  await page.goto(`${base}/products`);
  const cartBeforeBuyNow = await page.evaluate(() =>
    localStorage.getItem("mira_cart"),
  );
  await page
    .getByRole("link", { name: `Mua ngay ${product.name}`, exact: true })
    .click();
  await page
    .locator(".pd-sizes")
    .getByRole("button", { name: "12", exact: true })
    .click();
  await page.locator(".pd-buy").click();
  await expect(page).toHaveURL(/\/checkout\?buyNow=1$/);
  await expect(
    page.getByRole("heading", { name: "Thông tin giao hàng" }),
  ).toBeVisible();
  await expect(page.locator(".checkout-mini")).toHaveCount(1);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("mira_cart")),
    cartBeforeBuyNow,
  );
  await page.goto(`${base}/products`);
  await page
    .getByRole("link", { name: `Mua ngay ${optionsProduct.name}`, exact: true })
    .click();
  await expect(page).toHaveURL(/nhan-vang-muse#purchase$/);
  await expect(page.locator("#purchase")).toBeFocused();
  await page.getByRole("button", { name: "14", exact: true }).click();
  await page.getByRole("button", { name: "MUA NGAY", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\?buyNow=1$/);
  assert.ok(
    (
      await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("mira_buy_now")),
      )
    )._id === optionsProduct._id &&
      (await page.evaluate(
        () => JSON.parse(sessionStorage.getItem("mira_buy_now")).size,
      )) === "14",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("mira_cart")),
    cartBeforeBuyNow,
  );
  await page.reload();
  await expect(page.locator(".checkout-mini")).toHaveCount(1);
  await expect(page.locator(".checkout-mini")).toContainText(
    optionsProduct.name,
  );
  await expect(page.locator(".checkout-mini")).toContainText("Kích cỡ 14");
  assert.equal(
    orderRequests.length,
    0,
    "Buy now does not create an order before confirmation",
  );
  console.log(
    "PASS buy now from catalog and configured product preserves selected size",
  );

  async function fillCheckout() {
    await page.getByLabel("Họ và tên", { exact: true }).fill(user.name);
    await page.getByLabel("Số điện thoại", { exact: true }).fill(user.phone);
    await page.getByLabel("Email (không bắt buộc)", { exact: true }).fill("");
    await page
      .getByLabel("Tỉnh / thành phố", { exact: true })
      .selectOption("79");
    await page
      .getByLabel("Phường / xã / đặc khu", { exact: true })
      .selectOption("25747");
    await page
      .getByLabel("Địa chỉ cụ thể", { exact: true })
      .fill("123 Nguyễn Trãi");
  }
  await fillCheckout();
  orderFails = true;
  await page.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Thông tin đơn hàng không hợp lệ",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("mira_cart")),
    cartBeforeBuyNow,
  );
  assert.ok(
    await page.evaluate(() => sessionStorage.getItem("mira_buy_now")),
    "Failed order preserves buy now draft",
  );
  orderFails = false;
  await page.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("mira_cart")),
    cartBeforeBuyNow,
    "Successful direct purchase keeps existing cart",
  );
  assert.equal(
    await page.evaluate(() => sessionStorage.getItem("mira_buy_now")),
    null,
  );
  const directOrder = orderRequests.at(-1);
  assert.equal(directOrder.customer.email, "");
  assert.equal(directOrder.items.length, 1);
  assert.equal(directOrder.items[0].product, optionsProduct._id);
  assert.equal(directOrder.items[0].size, "14");
  assert.equal(directOrder.items[0].quantity, 1);
  assert.equal(directOrder.paymentMethod, "COD");

  await page.goto(`${base}/products`);
  await page
    .getByRole("link", { name: `Mua ngay ${product.name}`, exact: true })
    .click();
  await page
    .locator(".pd-sizes")
    .getByRole("button", { name: "12", exact: true })
    .click();
  await page.locator(".pd-buy").click();
  await fillCheckout();
  await page.getByRole("button", { name: /Chuyển khoản QR/ }).click();
  await page.getByRole("button", { name: /XÁC NHẬN ĐƠN HÀNG/ }).click();
  await expect(page).toHaveURL(/\/checkout\?order=fixture-order$/);
  await expect(
    page.getByRole("heading", { name: "Hoàn tất thanh toán", exact: true }),
  ).toBeVisible();
  assert.equal(orderRequests.at(-1).paymentMethod, "BANK_QR");
  assert.equal(orderRequests.at(-1).customer.email, "");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("mira_cart")),
    cartBeforeBuyNow,
  );
  console.log(
    "PASS direct COD/QR checkout with blank email, failed submit retry, isolated draft and original cart preserved after success",
  );

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, route] of [
      ["home", "/"],
      ["catalog", "/products"],
      ["detail", `/product/${product.slug}`],
      ["login", "/login"],
      ["register", "/register"],
      ["wishlist", "/wishlist"],
      ["account", "/account"],
      ["cart", "/cart"],
      ["checkout", "/checkout"],
      ["advisor", "/advisor"],
      ["recommendations", "/for-you"],
      ["diamonds", "/diamond-dss"],
      ["ring-sizer", "/ring-sizer"],
      ["jewelry-quiz", "/jewelry-quiz"],
      ["appointments", "/appointments"],
      ["about", "/about"],
      ["admin", "/admin"],
    ]) {
      await page.goto(base + route);
      await page.locator("#main-content,main,section.simple").first().waitFor();
      await page.waitForLoadState("networkidle");
      await fits(`${name} ${width}`);
      await page.screenshot({
        path: `scr/test-data/results/system-ui/${name}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.getByRole("button", { name: "Khuyến mãi", exact: true }).click();
    await fits(`promotions ${width}`);
    await page.screenshot({
      path: `scr/test-data/results/system-ui/promotions-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  assert.deepEqual(errors, []);
  assert.ok(paymentRequests >= 5);
  assert.equal(
    orderRequests.length,
    3,
    "Only explicit checkout submissions create order requests",
  );
  console.log(
    "PASS 18 screens on mobile/desktop, no horizontal overflow or JavaScript errors; all API writes mocked",
  );
} finally {
  await browser.close();
}
