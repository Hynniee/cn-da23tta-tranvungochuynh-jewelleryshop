import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.UI_TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await fs.mkdir("scr/test-data/results", { recursive: true });
try {
  // Fixtures stay in the browser; the configured database is never modified.
  await page.route("**/api/products", (route) => route.fulfill({ json: [] }));
  await page.goto(base);
  await expect(page.locator(".best-section")).toContainText(
    "Bộ sưu tập đang được cập nhật",
  );
  const images = await page
    .locator(".hero-lux > img, .cat-card > img")
    .evaluateAll(async (elements) => {
      await Promise.all(elements.map((image) => image.decode()));
      return elements.every(
        (image) =>
          image.naturalWidth > 0 &&
          new URL(image.src).pathname.startsWith("/editorial/"),
      );
    });
  assert.ok(images, "Hero and categories use working local images");
  await page.locator(".craft-photo img").scrollIntoViewIfNeeded();
  await page.locator(".craft-photo img").evaluate((image) => image.decode());
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "scr/test-data/results/home-refined-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Tìm kiếm trang sức", exact: true })
    .fill("ngọc trai");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page).toHaveURL(/\/products\?search=/);
  await expect(
    page.getByRole("textbox", { name: "Tìm sản phẩm", exact: true }),
  ).toHaveValue("ngọc trai");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(page.locator("#primary-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#primary-navigation")).toBeHidden();
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .locator("#primary-navigation")
    .getByRole("link", { name: "TRANG CHỦ", exact: true })
    .click();
  await expect(page.locator("#primary-navigation")).toBeHidden();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({
    path: "scr/test-data/results/home-refined-mobile.png",
    fullPage: true,
  });
  await page.unroute("**/api/products");
  await page.route("**/api/products", (route) =>
    route.fulfill({ status: 500, json: { message: "Test outage" } }),
  );
  await page.goto(`${base}/wishlist`);
  await expect(page.getByRole("alert")).toContainText("Chưa tải được");
  await expect(
    page.getByText("Chưa có sản phẩm yêu thích.", { exact: true }),
  ).toHaveCount(0);
  await page.goto(`${base}/products`);
  await expect(page.getByRole("alert")).toContainText("Không tải được");
  await expect(
    page.getByRole("heading", { name: "Không có sản phẩm phù hợp" }),
  ).toHaveCount(0);
  await page.unroute("**/api/products");
  await page.route("**/api/products", (route) => route.fulfill({ json: [] }));
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Không có sản phẩm phù hợp" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto(`${base}/for-you`);
  await expect(
    page.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("mira_token", "browser-fixture"),
  );
  await page.route("**/api/recommendations", (route) =>
    route.fulfill({
      json: {
        products: [
          {
            _id: "fixture",
            slug: "fixture",
            name: "Nhẫn kiểm thử",
            images: ["/products/nhan-bac-flora.svg"],
            price: 900000,
            salePrice: 700000,
            score: 75,
          },
        ],
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".smart-products")).toContainText("700.000₫");
  await expect(page.locator(".smart-products")).not.toContainText("900.000₫");
  await page.evaluate(() => localStorage.removeItem("mira_token"));
  await page.goto(`${base}/login`);
  await page
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }),
  ).toBeVisible();
  const favorites = [
    {
      _id: "favorite-one",
      slug: "favorite-one",
      name: "Nhẫn yêu thích",
      category: "Nhẫn",
      material: "Bạc 925",
      price: 650000,
      stock: 8,
      sizes: ["Tiêu chuẩn"],
      images: ["/products/nhan-bac-flora.svg"],
    },
    {
      _id: "favorite-two",
      slug: "favorite-two",
      name: "Vòng yêu thích",
      category: "Vòng tay",
      material: "Bạc 925",
      price: 750000,
      stock: 6,
      sizes: ["Tiêu chuẩn"],
      images: ["/products/nhan-bac-flora.svg"],
    },
  ];
  await page.unroute("**/api/products");
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: favorites }),
  );
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        name: "Wishlist Buyer",
        email: "fixture@example.com",
        role: "customer",
      },
    }),
  );
  await page.route("**/api/orders/mine", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.evaluate(() => {
    localStorage.setItem("mira_token", "browser-fixture");
    localStorage.setItem(
      "mira_wishlist",
      JSON.stringify(["favorite-one", "favorite-two"]),
    );
  });
  await page.goto(`${base}/account?tab=wishlist`);
  await expect(page.locator(".account-card .product-card")).toHaveCount(2);
  await expect(page.locator(".account-card")).toContainText("650.000₫");
  await expect(page.locator('.account-card a[href="/wishlist"]')).toHaveCount(
    0,
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page
      .locator(".account-card")
      .screenshot({
        path: `scr/test-data/results/account-wishlist-${width}.png`,
      });
  }
  await page
    .getByRole("button", { name: "Yêu thích Nhẫn yêu thích", exact: true })
    .click();
  await expect(page.locator(".account-card .product-card")).toHaveCount(1);
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("mira_wishlist")),
    ),
    ["favorite-two"],
  );
  await page.goto(`${base}/wishlist`);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Vòng yêu thích");
  await page
    .getByRole("button", { name: "Yêu thích Vòng yêu thích", exact: true })
    .click();
  await expect(
    page.getByText("Chưa có sản phẩm yêu thích.", { exact: true }),
  ).toBeVisible();
  await page.goto(`${base}/account?tab=wishlist`);
  await expect(
    page.getByText("Chưa có sản phẩm yêu thích.", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/products");
  await page.route("**/api/products", (route) =>
    route.fulfill({ status: 500, json: { message: "Fixture outage" } }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Chưa tải được sản phẩm yêu thích",
  );
  await expect(
    page.getByText("Chưa có sản phẩm yêu thích.", { exact: true }),
  ).toHaveCount(0);
  await page.unroute("**/api/products");
  await page.route("**/api/products", (route) =>
    route.fulfill({ json: favorites }),
  );
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByText("Chưa có sản phẩm yêu thích.", { exact: true }),
  ).toBeVisible();
  console.log(
    "PASS wishlist renders directly in account, shares saved products and removal with wishlist page, fits mobile/desktop and handles empty/error/retry",
  );
  assert.deepEqual(errors, [], "No browser JavaScript errors");
  console.log(
    "PASS local editorial images, header search, mobile menu, responsive layout, outage/retry states, guest recommendations and password visibility",
  );
} finally {
  await browser.close();
}
