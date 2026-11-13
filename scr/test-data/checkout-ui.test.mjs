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
  sizes: ["Tiêu chuẩn"],
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
const writes = [];
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
  if (path === "/api/products") json = products;
  else if (path === "/api/auth/me") json = user;
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
  } else if (path.startsWith("/api/payments/order/"))
    json = {
      orderCode: "MIRA20261113TEST",
      paymentStatus,
      status: paymentOrderStatus,
    };
  else if (path === "/api/promotions/quote") {
    const items = req
      .postDataJSON()
      .items.map((item) => ({ ...item, price: product.price }));
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
  else if (
    ["/api/orders", "/api/orders/mine", "/api/promotions"].includes(path)
  )
    json = [];
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
            size: "Tiêu chuẩn",
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
  await page
    .getByRole("button", { name: "Kiểm tra thanh toán", exact: true })
    .click();
  await expect(page.locator(".payment-status")).toContainText("Chờ thanh toán");
  paymentStatus = "PAID";
  await page
    .getByRole("button", { name: "Kiểm tra thanh toán", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thanh toán thành công", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".transfer-qr-frame")).toHaveCount(0);
  console.log(
    "PASS QR layout 320/390/768/1440, copy, unpaid/paid status from server",
  );

  qrFails = true;
  paymentStatus = "UNPAID";
  await page.goto(`${base}/checkout?order=fixture-failed-image`);
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
    .getByRole("button", { name: "Kiểm tra thanh toán", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đơn hàng đã hủy", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".transfer-qr-frame")).toHaveCount(0);
  console.log(
    "PASS QR image failure/retry and cancelled order prevents transfer prompt",
  );

  await page.goto(`${base}/products`);
  await page
    .getByRole("button", { name: `Mua ngay ${product.name}`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(
    page.getByRole("heading", { name: "Thông Tin Bàn Giao" }),
  ).toBeVisible();
  await page.goto(`${base}/products`);
  await page
    .getByRole("link", { name: `Mua ngay ${optionsProduct.name}`, exact: true })
    .click();
  await expect(page).toHaveURL(/nhan-vang-muse#purchase$/);
  await expect(page.locator("#purchase")).toBeFocused();
  await page.getByRole("button", { name: "14", exact: true }).click();
  await page.getByRole("button", { name: "MUA NGAY", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  assert.ok(
    (
      await page.evaluate(() => JSON.parse(localStorage.getItem("mira_cart")))
    ).some((p) => p._id === optionsProduct._id && p.size === "14"),
  );
  console.log(
    "PASS buy now from catalog and configured product preserves selected size",
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
  assert.ok(
    !writes.includes("/api/orders"),
    "Buy now opens checkout without creating any order",
  );
  console.log(
    "PASS 18 screens on mobile/desktop, no horizontal overflow or JavaScript errors; all API writes mocked",
  );
} finally {
  await browser.close();
}
