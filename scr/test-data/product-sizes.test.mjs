import assert from "node:assert/strict";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import {
  productSizes,
  defaultProductSizes,
} from "../server/src/services/product-sizes.ts";
import { reconcileItems, cartHasValidSizes } from "../client/src/store/cart.ts";

process.env.JWT_SECRET = "isolated-size-test-secret-32-characters";
const root = fileURLToPath(new URL("../../", import.meta.url));
let mongo, server, vite, browser;
let checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log("PASS", label);
};
try {
  const legacy = { category: "Nhẫn", sizes: ["Tiêu chuẩn"] };
  check(
    productSizes(legacy).includes("14") && legacy.sizes[0] === "Tiêu chuẩn",
    "legacy rings expose real size choices without rewriting source data",
  );
  check(
    JSON.stringify(
      productSizes({ category: "Nhẫn", sizes: ["14", "16", "14"] }),
    ) === '["14","16"]',
    "explicit product sizes take priority and duplicates are removed",
  );
  check(
    defaultProductSizes("Dây chuyền").includes("45 cm") &&
      defaultProductSizes("Lắc tay").includes("18 cm") &&
      defaultProductSizes("Bông tai").length === 0,
    "category presets use dimensions and fixed accessories do not get invented fit sizes",
  );
  const oldCart = [
    {
      _id: "ring",
      name: "Old ring",
      price: 10,
      stock: 5,
      size: "Tiêu chuẩn",
      image: "",
      quantity: 1,
    },
  ];
  const product = {
    _id: "ring",
    slug: "ring",
    name: "Ring",
    category: "Nhẫn",
    material: "Bạc",
    price: 10,
    stock: 5,
  };
  const migrated = reconcileItems(oldCart, [product]);
  check(
    migrated[0].size === "" &&
      !cartHasValidSizes(migrated) &&
      oldCart[0].size === "Tiêu chuẩn",
    "old standard-size cart items must be reselected instead of silently selecting a size",
  );
  check(
    cartHasValidSizes(
      reconcileItems([{ ...oldCart[0], size: "14" }], [product]),
    ),
    "valid size selections survive cart reconciliation",
  );

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { default: app } = await import("../server/dist/app.js");
  const { default: Product } = await import("../server/dist/models/Product.js");
  const { default: Order } = await import("../server/dist/models/Order.js");
  const { default: User } = await import("../server/dist/models/User.js");
  const { provinces } =
    await import("../server/dist/services/shipping-address.service.js");
  const buyer = await User.create({
    name: "Khách chọn size",
    email: "sizes@example.test",
    password: "unused",
  });
  const accessToken = jwt.sign(
    { id: String(buyer._id), role: "customer" },
    process.env.JWT_SECRET,
  );
  const [ring, necklace, earrings, custom] = await Product.create([
    {
      name: "Nhẫn chọn size",
      slug: "size-ring",
      category: "Nhẫn",
      material: "Bạc 925",
      price: 1000000,
      stock: 20,
      sizes: [],
      images: ["/placeholder.svg"],
    },
    {
      name: "Dây chuyền chọn chiều dài",
      slug: "size-necklace",
      category: "Dây chuyền",
      material: "Bạc 925",
      price: 800000,
      stock: 20,
      sizes: ["Tiêu chuẩn"],
      images: ["/placeholder.svg"],
    },
    {
      name: "Bông tai theo thiết kế",
      slug: "size-earrings",
      category: "Bông tai",
      material: "Bạc 925",
      price: 500000,
      stock: 20,
      sizes: ["Tiêu chuẩn"],
      images: ["/placeholder.svg"],
    },
    {
      name: "Nhẫn size riêng",
      slug: "custom-size-ring",
      category: "Nhẫn",
      material: "Bạc 925",
      price: 1000000,
      stock: 20,
      sizes: ["13", "15"],
      images: ["/placeholder.svg"],
    },
  ]);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  async function api(url, { method = "GET", body, status = 200 } = {}) {
    const response = await fetch(`${base}/api${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
  const catalog = await api("/products");
  check(
    catalog.find((p) => p.slug === ring.slug).sizes.includes("14") &&
      catalog.find((p) => p.slug === necklace.slug).sizes.includes("45 cm") &&
      catalog.find((p) => p.slug === earrings.slug).sizes.length === 0,
    "catalog API and detail expose concrete sizes for legacy products",
  );
  const quote = (size) =>
    api("/promotions/quote", {
      method: "POST",
      body: {
        items: [
          {
            product: String(ring._id),
            quantity: 1,
            ...(size !== undefined ? { size } : {}),
          },
        ],
      },
      status: 400,
    });
  for (const size of [undefined, "", "Tiêu chuẩn", "999", { value: "14" }])
    await quote(size);
  check(true, "server rejects missing, generic, unknown and malformed sizes");
  const customer = {
    name: buyer.name,
    phone: "0901234567",
    email: "",
    provinceCode: provinces[0].code,
    wardCode: provinces[0].wards[0].code,
    addressLine: "12 Đường Kiểm Thử",
  };
  await api("/orders", {
    method: "POST",
    body: {
      customer,
      paymentMethod: "COD",
      items: [{ product: String(ring._id), quantity: 1, size: "Tiêu chuẩn" }],
    },
    status: 400,
  });
  check(
    (await Order.countDocuments()) === 0 &&
      (await Product.findById(ring._id)).stock === 20,
    "invalid sizes cannot create an order or reserve inventory",
  );
  const order = await api("/orders", {
    method: "POST",
    body: {
      customer,
      paymentMethod: "COD",
      items: [{ product: String(ring._id), quantity: 1, size: "14" }],
    },
    status: 201,
  });
  check(
    (await Order.findById(order._id)).items[0].size === "14" &&
      (await Product.findById(ring._id)).stock === 19,
    "selected size is saved in the order with inventory reserved normally",
  );
  await api("/promotions/quote", {
    method: "POST",
    body: { items: [{ product: String(custom._id), quantity: 1, size: "14" }] },
    status: 400,
  });
  await api("/promotions/quote", {
    method: "POST",
    body: { items: [{ product: String(custom._id), quantity: 1, size: "15" }] },
  });
  const fixedQuote = await api("/promotions/quote", {
    method: "POST",
    body: {
      items: [
        { product: String(earrings._id), quantity: 1, size: "Tiêu chuẩn" },
      ],
    },
  });
  check(
    fixedQuote.items[0].size === "",
    "legacy placeholder sizes are removed from fixed-accessory order data",
  );

  process.env.API_PROXY_TARGET = base;
  vite = await createServer({
    configFile: path.join(root, "scr/client/vite.config.ts"),
    root: path.join(root, "scr/client"),
    server: { host: "127.0.0.1", port: 0 },
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    ({ accessToken, user }) => {
      localStorage.setItem("mira_token", accessToken);
      localStorage.setItem("mira_user", JSON.stringify(user));
    },
    {
      accessToken,
      user: { name: buyer.name, email: buyer.email, role: "customer" },
    },
  );
  await page.goto(`${url}/products`);
  await page
    .getByRole("link", { name: `Mua ngay ${ring.name}`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/product\/size-ring#purchase$/);
  await expect(page.locator(".pd-sizes button[aria-pressed=true]")).toHaveCount(
    0,
  );
  await page.locator(".pd-buy").click();
  await expect(page.getByRole("alert")).toContainText("Vui lòng chọn kích cỡ");
  check(
    await page.evaluate(() => sessionStorage.getItem("mira_buy_now") === null),
    "catalog buy-now opens size selection and cannot bypass required choice",
  );
  await page
    .locator(".pd-sizes")
    .getByRole("button", { name: "14", exact: true })
    .click();
  await page.locator(".pd-add").click();
  await page
    .locator(".pd-sizes")
    .getByRole("button", { name: "16", exact: true })
    .click();
  await page.locator(".pd-add").click();
  const cart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mira_cart")),
  );
  check(
    cart.length === 2 && cart[0].size === "14" && cart[1].size === "16",
    "different selected sizes remain distinct cart variants",
  );
  await page.locator(".pd-buy").click();
  await expect(page).toHaveURL(/\/checkout\?buyNow=1$/);
  await expect(page.locator(".checkout-mini")).toContainText("Kích cỡ 16");
  check(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("mira_buy_now")).size === "16" &&
        JSON.parse(localStorage.getItem("mira_cart")).length === 2,
    ),
    "buy-now preserves selected size and does not replace the regular cart",
  );
  await page.evaluate(
    (ring) =>
      localStorage.setItem(
        "mira_cart",
        JSON.stringify([
          {
            _id: ring._id,
            slug: ring.slug,
            name: ring.name,
            price: ring.price,
            image: "/placeholder.svg",
            size: "Tiêu chuẩn",
            quantity: 1,
          },
        ]),
      ),
    JSON.parse(JSON.stringify(ring)),
  );
  await page.goto(`${url}/cart`);
  const select = page.getByRole("combobox", {
    name: `Kích cỡ ${ring.name}`,
    exact: true,
  });
  await expect(select).toHaveValue("");
  await expect(
    page.getByRole("link", { name: "Tiến hành thanh toán", exact: true }),
  ).toHaveCount(0);
  await select.selectOption("12");
  await expect(
    page.getByRole("link", { name: "Tiến hành thanh toán", exact: true }),
  ).toBeVisible();
  check(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("mira_cart"))[0].size === "12",
    ),
    "old cart requires reselection and supports changing size directly before checkout",
  );
  await page.goto(`${url}/product/size-necklace`);
  await expect(
    page
      .locator(".pd-sizes")
      .getByRole("button", { name: "45 cm", exact: true }),
  ).toBeVisible();
  await page.goto(`${url}/product/custom-size-ring`);
  await expect(page.locator(".pd-sizes button")).toHaveCount(2);
  await page.goto(`${url}/product/size-earrings`);
  await expect(page.locator(".pd-size-note")).toContainText("bán theo đôi");
  await expect(page.locator(".pd-sizes")).toHaveCount(0);
  await expect(page.locator(".pd-config")).not.toContainText("Tiêu chuẩn");
  check(
    true,
    "necklaces expose length, explicit sizes stay limited and fixed accessories have no standard-size selector",
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${url}/product/size-ring`);
    await expect(page.locator(".pd-sizes button")).toHaveCount(15);
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `size picker fits ${width}px`,
    );
    await page.locator(".pd-sizes").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(root, `.local-data/product-sizes-${width}.png`),
    });
  }
  check(errors.length === 0, `no browser errors: ${errors.join(", ")}`);
  console.log(`Product sizes: ${checks} checks passed.`);
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
