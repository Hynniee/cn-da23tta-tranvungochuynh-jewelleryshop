import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
process.env.JWT_SECRET = "ui-audit-isolated-secret-32-characters";
let mongo, server, vite, browser;
const phase = process.env.AUDIT_PHASE || "final";
const directory = path.resolve(".local-data/ui-audit", phase);
await fs.mkdir(directory, { recursive: true });
try {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { default: app } = await import("../server/dist/app.js");
  const { default: Product } = await import("../server/dist/models/Product.js");
  const { default: User } = await import("../server/dist/models/User.js");
  const { default: Diamond } = await import("../server/dist/models/Diamond.js");
  const { default: Appointment } =
    await import("../server/dist/models/Appointment.js");
  const { default: Order } = await import("../server/dist/models/Order.js");
  const catalog = JSON.parse(
    await fs.readFile("scr/server/src/data/catalog.json", "utf8"),
  );
  const products = await Product.create(
    catalog.map((p, i) => ({
      ...p,
      stock: i === 1 ? 0 : i === 2 ? 2 : i === 3 ? 5 : 30,
      images: p.images || [p.image],
      sizes: ["Nhẫn", "Nhẫn cưới"].includes(p.category)
        ? ["12", "14", "16"]
        : p.sizes,
      description:
        p.description ||
        "Thiết kế trang sức tinh tế, phù hợp để đeo hằng ngày và làm quà tặng",
    })),
  );
  const ring = products.find((p) => p.category === "Nhẫn");
  const buyer = await User.create({
    name: "Khách hàng MIRA",
    email: "audit@example.test",
    password: "unused",
  });
  const admin = await User.create({
    name: "Quản trị MIRA",
    email: "admin-audit@example.test",
    password: "unused",
    role: "admin",
  });
  const order = await Order.create({
    orderCode: "MIRAAUDIT2026",
    user: buyer._id,
    items: [
      {
        product: ring._id,
        name: ring.name,
        quantity: 2,
        price: ring.price,
        size: "12",
        image: ring.images[0],
      },
    ],
    customer: {
      name: buyer.name,
      phone: "0901234567",
      address: "12 Nguyễn Huệ, TP Hồ Chí Minh",
    },
    total: ring.price * 2,
    paymentMethod: "COD",
    status: "completed",
    paymentStatus: "PAID",
  });
  const diamond = await Diamond.create({
    code: "GIA-AUDIT",
    carat: 1,
    cut: "Excellent",
    color: "E",
    clarity: "VVS1",
    price: 168000000,
    stock: 1,
  });
  const appointmentToken = randomUUID();
  const appointment = await Appointment.create({
    code: "MIRAAUDITAPPT",
    accessTokenHash: createHash("sha256")
      .update(appointmentToken)
      .digest("hex"),
    ipHash: "isolated-audit",
    name: buyer.name,
    email: buyer.email,
    phone: "0901234567",
    salonId: "hcm",
    salonName: "MIRA Hồ Chí Minh",
    date: "2026-11-15",
    time: "10:00",
    startsAt: new Date("2026-11-15T03:00:00Z"),
    timeZone: "Asia/Ho_Chi_Minh",
    interest: "Nhẫn",
    budget: "10–20 triệu",
    emailStatus: "not_configured",
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  process.env.API_PROXY_TARGET = `http://127.0.0.1:${server.address().port}`;
  vite = await createServer({
    configFile: path.resolve("scr/client/vite.config.ts"),
    root: path.resolve("scr/client"),
    server: { host: "127.0.0.1", port: 0 },
  });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const sign = (user) =>
    jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET);
  await page.addInitScript(
    ({
      buyer,
      admin,
      buyerToken,
      adminToken,
      ring,
      appointmentToken,
      appointmentCode,
    }) => {
      sessionStorage.setItem(
        `mira_appointment_${appointmentCode}`,
        appointmentToken,
      );
      const isAdmin = location.pathname === "/admin";
      const user = isAdmin ? admin : buyer;
      if (!["/login", "/register"].includes(location.pathname)) {
        localStorage.setItem("mira_token", isAdmin ? adminToken : buyerToken);
        localStorage.setItem("mira_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("mira_token");
        localStorage.removeItem("mira_user");
      }
      localStorage.setItem(
        "mira_cart",
        JSON.stringify([
          {
            _id: ring._id,
            slug: ring.slug,
            name: ring.name,
            price: ring.price,
            image: ring.images[0],
            quantity: 2,
            size: "12",
            stock: 30,
            material: ring.material,
          },
        ]),
      );
      localStorage.setItem("mira_wishlist", JSON.stringify([ring._id]));
    },
    {
      buyer: { name: buyer.name, email: buyer.email, role: buyer.role },
      admin: { name: admin.name, email: admin.email, role: admin.role },
      buyerToken: sign(buyer),
      adminToken: sign(admin),
      ring: JSON.parse(JSON.stringify(ring)),
      appointmentToken,
      appointmentCode: appointment.code,
    },
  );
  const all = [
    "/",
    "/products",
    "/shop",
    "/shop?collection=vang",
    "/shop?collection=cuoi",
    "/shop?collection=bac",
    "/shop?collection=ngoc-trai",
    "/services/bespoke",
    "/services/maintenance",
    "/policies/exchange",
    `/product/${ring.slug}`,
    "/cart",
    "/checkout",
    "/login",
    "/register",
    "/account",
    "/wishlist",
    "/about",
    "/advisor",
    "/ring-sizer",
    "/jewelry-care",
    "/support",
    "/jewelry-quiz",
    "/appointments",
    "/for-you",
    "/diamond-dss",
    `/thank-you?order=${order._id}`,
    `/diamond/${diamond._id}`,
    `/appointments/${appointment.code}`,
    "/admin",
    "/admin?tab=products",
    "/admin?tab=orders",
    "/admin?tab=customers",
    "/admin?tab=messages",
    "/admin?tab=promotions",
    "/admin?tab=analytics",
  ];
  const routes = process.env.AUDIT_ROUTES
    ? process.env.AUDIT_ROUTES.split(",").map((p) =>
        p === "detail" ? `/product/${ring.slug}` : p,
      )
    : all;
  const widths = (process.env.AUDIT_WIDTHS || "1440,768,390,320")
    .split(",")
    .map(Number);
  const report = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
    for (const route of routes) {
      await page.goto(base + route);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.left >= 0 &&
              r.right > innerWidth + 2 &&
              getComputedStyle(e).position !== "fixed" &&
              !e.closest('[class*="table"],pre')
            );
          })
          .slice(0, 8)
          .map((e) => ({
            tag: e.tagName,
            cls: e.className,
            right: Math.round(e.getBoundingClientRect().right),
          })),
        fonts: [
          ...new Set(
            [...document.querySelectorAll("h1,h2,h3,p,button,input")]
              .filter((e) => e.getBoundingClientRect().width > 0)
              .map((e) => getComputedStyle(e).fontFamily),
          ),
        ],
      }));
      const name =
        route === "/"
          ? "home"
          : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      await page.screenshot({
        path: path.join(directory, `${width}-${name}.png`),
      });
      report.push({ width, route, ...metrics });
      if (metrics.overflow > 1)
        console.log("OVERFLOW", width, route, metrics.offenders);
      assert.ok(
        metrics.overflow <= 1,
        `${width}px ${route}: page overflows by ${metrics.overflow}px`,
      );
      assert.ok(
        metrics.fonts.every((font) => font.includes("Be Vietnam Pro")),
        `${route}: inconsistent font family`,
      );

      const collectionExpectations = {
        vang: {
          title: "Nhẫn & trang sức vàng",
          products: products.filter((p) => p.material.startsWith("Vàng")),
        },
        cuoi: {
          title: "Trang sức cưới",
          products: products.filter(
            (p) =>
              p.category === "Nhẫn cưới" ||
              p.occasion.some(
                (value) => value === "Cưới" || value === "Cầu hôn",
              ),
          ),
        },
        bac: {
          title: "Trang sức bạc 925",
          products: products.filter((p) => p.material === "Bạc 925"),
        },
        "ngoc-trai": {
          title: "Trang sức ngọc trai",
          products: products.filter((p) => p.stone === "Ngọc trai"),
        },
      };
      if (route.startsWith("/shop?collection=")) {
        const key = new URLSearchParams(route.split("?")[1]).get("collection");
        const expected = collectionExpectations[key];
        if (expected) {
          await expect(
            page.getByRole("heading", { name: expected.title, exact: true }),
          ).toBeVisible();
          await expect(page.locator(".shop-intro > div > b")).toHaveText(
            String(expected.products.length),
          );
          const names = await page.locator(".shop-card h3").allTextContents();
          assert.ok(
            names.length > 0 &&
              names.every((name) =>
                expected.products.some((p) => p.name === name),
              ),
            "Collection shows only the matching designs",
          );
          if (key === "cuoi") {
            await page.locator(".collection-guide").getByRole("link").click();
            await expect(
              page.getByLabel("Nhu cầu tư vấn", { exact: false }),
            ).toHaveValue("Trang sức cưới");
          }
        }
      }
      const serviceRoutes = {
        "/services/bespoke": "Dịch vụ chế tác riêng",
        "/services/maintenance": "Bảo dưỡng trang sức",
        "/policies/exchange": "Chính sách thu đổi",
      };
      if (serviceRoutes[route]) {
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: serviceRoutes[route],
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator(".service-step-grid article")).toHaveCount(3);
        await page.locator(".service-faq summary").first().click();
        await expect(
          page.locator(".service-faq details").first(),
        ).toHaveAttribute("open", "");
        await page
          .locator(".service-actions")
          .getByRole("link", { name: "Đặt lịch tư vấn", exact: false })
          .click();
        await expect(
          page.getByLabel("Lời nhắn cho chuyên viên", { exact: false }),
        ).toHaveValue(/Nhu cầu: /);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Service booking fits the viewport",
        );
      }
      if (route === "/admin?tab=products") {
        const stocks = await page
          .locator(".inventory-total b")
          .allTextContents();
        const values = stocks.map(Number);
        assert.deepEqual(
          values.slice(0, 3),
          [0, 2, 5],
          "Sold-out and low-stock products appear first",
        );
        assert.ok(
          values.every(
            (value, index) => index === 0 || value >= values[index - 1],
          ),
          "Stock remains ascending throughout the product list",
        );
        const input = page.getByPlaceholder("Tìm theo tên sản phẩm...", {
          exact: true,
        });
        await input.fill("Nhẫn");
        const filtered = (
          await page.locator(".inventory-total b").allTextContents()
        ).map(Number);
        assert.ok(
          filtered.length > 0 &&
            filtered.every(
              (value, index) => index === 0 || value >= filtered[index - 1],
            ),
          "Filtering preserves low-stock priority",
        );
        await input.fill("");
      }
      if (route === "/diamond-dss") {
        if (width > 760) {
          const topK = await page.getByLabel("Số lựa chọn Top-K").boundingBox();
          const weights = await page.locator(".dss-weights").boundingBox();
          assert.ok(
            topK.width > 100,
            "Ranking fields have enough room for labels",
          );
          assert.ok(
            weights.y > topK.y + topK.height,
            "Weights are placed below the criteria row",
          );
        }
        await page
          .getByRole("button", { name: "XẾP HẠNG", exact: true })
          .click();
        await expect(page.locator(".diamond-table article")).toHaveCount(1);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Ranked diamond results fit the viewport",
        );
        await page.screenshot({
          path: path.join(directory, `${width}-diamond-results.png`),
        });
      }
      if (route === "/account") {
        const footer = page.locator(".account-form footer");
        assert.ok(
          (await footer.boundingBox()).height < 120,
          "Profile save footer must remain compact",
        );
        assert.equal(
          await footer.evaluate((el) => getComputedStyle(el).backgroundColor),
          "rgba(0, 0, 0, 0)",
        );
        if (width <= 760) {
          await expect(page.locator("#account-navigation")).toBeHidden();
          await page
            .getByRole("button", { name: "Mục tài khoản", exact: true })
            .click();
          await expect(page.locator("#account-navigation")).toBeVisible();
          await page
            .getByRole("button", { name: "Đơn hàng của tôi", exact: false })
            .click();
          await expect(
            page.getByRole("heading", {
              name: "Đơn hàng của tôi",
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.locator("#account-navigation")).toBeHidden();
        }
      }
      if (route === "/admin?tab=products" && width <= 760) {
        const row = page.locator(".product-admin-table .table-row").first();
        assert.ok(
          (await row.boundingBox()).width < width,
          "Mobile product cards fit",
        );
        const toggle = page.locator(".inventory-toggle").first();
        await toggle.click();
        assert.ok(
          (await page.locator(".product-inventory-panel").boundingBox()).width <
            width,
          "Expanded size inventory fits",
        );
        await page
          .getByRole("button", { name: "THÊM SẢN PHẨM", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        assert.ok(
          await page
            .getByRole("dialog")
            .evaluate((el) => el.scrollWidth <= innerWidth),
          "Product modal fits the viewport",
        );
        await page.screenshot({
          path: path.join(directory, `${width}-admin-product-modal.png`),
        });
        await page
          .getByRole("button", { name: "Đóng form sản phẩm", exact: true })
          .click();
      }
    }
    console.log(`PASS ${routes.length} routes at ${width}px`);
  }
  assert.deepEqual(errors, [], "No browser runtime errors");
  await fs.writeFile(
    path.join(directory, "report.json"),
    JSON.stringify({ report, errors }, null, 2),
  );
  console.log(
    "AUDIT COMPLETE",
    report.length,
    "pages; browser errors:",
    errors.length,
  );
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
