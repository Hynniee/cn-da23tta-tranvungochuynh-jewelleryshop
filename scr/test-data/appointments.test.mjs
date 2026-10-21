import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { SMTPServer } from "smtp-server";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));

test(
  "Private Salon booking, SMTP confirmation and browser flow",
  { timeout: 180000 },
  async (t) => {
    const messages = [];
    let rejectMail = false,
      mongo,
      http,
      vite,
      browser;
    const smtp = new SMTPServer({
      disabledCommands: ["STARTTLS"],
      allowInsecureAuth: true,
      onAuth(_auth, _session, callback) {
        callback(null, { user: "test" });
      },
      onData(stream, session, callback) {
        let raw = "";
        stream.on("data", (chunk) => {
          raw += chunk;
        });
        stream.on("end", () => {
          if (rejectMail) {
            callback(new Error("Simulated SMTP failure"));
            return;
          }
          messages.push({
            raw,
            to: session.envelope.rcptTo.map((entry) => entry.address),
          });
          callback();
        });
      },
    });
    const serverLogs = [];
    try {
      await new Promise((resolve) => smtp.listen(0, "127.0.0.1", resolve));
      Object.assign(process.env, {
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(smtp.server.address().port),
        SMTP_SECURE: "false",
        SMTP_USER: "test",
        SMTP_PASS: "test",
        MAIL_FROM: "MIRA <salon@example.com>",
        JWT_SECRET: "appointment-test-secret-only-at-least-32-characters",
        GEMINI_API_KEY: "",
      });
      mongo = await MongoMemoryServer.create({
        instance: { launchTimeout: 30000 },
      });
      await mongoose.connect(mongo.getUri());
      const { default: app } = await import("../server/dist/app.js");
      const { default: Appointment } =
        await import("../server/dist/models/Appointment.js");
      await Appointment.init();
      http = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => http.once("listening", resolve));
      const base = `http://127.0.0.1:${http.address().port}`;
      const api = async (
        endpoint,
        { body, token, status = 200, method = body ? "POST" : "GET" } = {},
      ) => {
        const response = await fetch(`${base}/api/appointments${endpoint}`, {
          method,
          headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { "X-Appointment-Token": token } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json();
        assert.equal(response.status, status, JSON.stringify(data));
        return data;
      };
      const date = new Date(Date.now() + 7 * 3600000 + 2 * 86400000)
        .toISOString()
        .slice(0, 10);
      const body = {
        name: "Nguyễn Minh Anh",
        email: "guest@example.com",
        phone: "0901234567",
        salonId: "hcm",
        date,
        time: "14:00",
        interest: "Trang sức cưới",
        budget: "20 – 50 triệu",
        notes: "Tôi muốn thử nhẫn vàng, phong cách tối giản.",
        bookingToken: randomUUID(),
      };
      await t.test(
        "rejects invalid fields, past dates, impossible dates and times",
        async () => {
          for (const change of [
            { name: " " },
            { email: "invalid" },
            { email: "ten@gmail" },
            { email: "ten..ban@gmail.com" },
            { email: "ten@-gmail.com" },
            { email: "ten@g_mail.com" },
            { email: "ten @gmail.com" },
            { email: "ten@gmail..com" },
            { email: "a@example.com,b@example.com" },
            { phone: "123" },
            { salonId: "fake" },
            { date: "2020-01-01" },
            { date: "2027-02-30" },
            { time: "23:00" },
            { notes: "a".repeat(1001) },
            { interest: "unknown" },
            { budget: "unknown" },
            { bookingToken: "bad" },
            {
              date: new Date(Date.now() + 100 * 86400000)
                .toISOString()
                .slice(0, 10),
            },
          ])
            await api("", { body: { ...body, ...change }, status: 400 });
          assert.equal(await Appointment.countDocuments(), 0);
        },
      );
      let booking;
      await t.test(
        "persists matching details, sends SMTP to entered email and preserves Vietnam time",
        async () => {
          booking = await api("", { body, status: 201 });
          assert.match(booking.code, /^MIRA-[A-F0-9]{12}$/);
          for (const field of [
            "name",
            "email",
            "phone",
            "salonId",
            "date",
            "time",
            "interest",
            "budget",
            "notes",
          ])
            assert.equal(booking[field], body[field]);
          assert.equal(
            booking.startsAt,
            new Date(`${date}T14:00:00+07:00`).toISOString(),
          );
          assert.equal(booking.emailStatus, "sent");
          assert.deepEqual(messages[0].to, [body.email]);
          const [headers, ...parts] = messages[0].raw.split("\r\n\r\n");
          const encoded = parts.join("\r\n\r\n");
          const text = /Content-Transfer-Encoding: base64/i.test(headers)
            ? Buffer.from(encoded.replace(/\s/g, ""), "base64").toString("utf8")
            : Buffer.from(
                encoded
                  .replace(/=\r\n/g, "")
                  .replace(/=([0-9A-F]{2})/gi, (_m, hex) =>
                    String.fromCharCode(parseInt(hex, 16)),
                  ),
                "binary",
              ).toString("utf8");
          for (const value of [
            body.name,
            body.email,
            body.phone,
            body.time,
            body.interest,
            body.budget,
            body.notes,
            booking.code,
            booking.salonName,
            date.split("-").reverse().join("/"),
          ])
            assert.ok(text.includes(value), `Email contains ${value}`);
          assert.equal(booking.accessTokenHash, undefined);
          assert.equal(booking.ipHash, undefined);
        },
      );
      await t.test(
        "protects private details and repeated submission does not duplicate booking/email",
        async () => {
          await api(`/${booking.code}`, { status: 404 });
          await api(`/${booking.code}`, { token: randomUUID(), status: 404 });
          const reloaded = await api(`/${booking.code}`, {
            token: body.bookingToken,
          });
          assert.equal(reloaded.code, booking.code);
          assert.equal((await api("", { body })).code, booking.code);
          await api(`/${booking.code}/email`, {
            method: "POST",
            token: body.bookingToken,
          });
          assert.equal(await Appointment.countDocuments(), 1);
          assert.equal(messages.length, 1);
        },
      );
      await t.test(
        "SMTP failure keeps booking and retry sends same appointment",
        async () => {
          rejectMail = true;
          const failingBody = { ...body, bookingToken: randomUUID() };
          const failed = await api("", { body: failingBody, status: 201 });
          assert.equal(failed.emailStatus, "failed");
          await api(`/${failed.code}/email`, {
            method: "POST",
            token: failingBody.bookingToken,
            status: 429,
          });
          await Appointment.updateOne(
            { code: failed.code },
            { emailAttemptedAt: new Date(Date.now() - 61000) },
          );
          rejectMail = false;
          const resent = await api(`/${failed.code}/email`, {
            method: "POST",
            token: failingBody.bookingToken,
          });
          assert.equal(resent.code, failed.code);
          assert.equal(resent.emailStatus, "sent");
        },
      );
      await t.test(
        "missing SMTP configuration is reported truthfully without losing appointment",
        async () => {
          process.env.SMTP_PASS = "";
          const unconfiguredBody = { ...body, bookingToken: randomUUID() };
          const saved = await api("", { body: unconfiguredBody, status: 201 });
          assert.equal(saved.emailStatus, "not_configured");
          await api(`/${saved.code}/email`, {
            method: "POST",
            token: unconfiguredBody.bookingToken,
            status: 503,
          });
          process.env.SMTP_PASS = "test";
        },
      );
      vite = spawn(
        process.execPath,
        [
          path.join(root, "node_modules/vite/bin/vite.js"),
          "--host",
          "127.0.0.1",
          "--port",
          "0",
        ],
        {
          cwd: path.join(root, "scr/client"),
          env: { ...process.env, API_PROXY_TARGET: base },
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let web;
      vite.stdout.on("data", (chunk) => {
        const text = String(chunk).replace(/\x1b\[[0-9;]*m/g, "");
        serverLogs.push(text);
        web ||= text.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      });
      vite.stderr.on("data", (chunk) => serverLogs.push(String(chunk)));
      for (let i = 0; i < 100 && !web; i++)
        await new Promise((resolve) => setTimeout(resolve, 100));
      assert.ok(web, serverLogs.join(""));
      browser = await chromium.launch({
        channel: process.env.TEST_BROWSER_CHANNEL || "chrome",
        headless: true,
      });
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await t.test(
        "footer opens form, booking navigates to matching confirmation and survives reload",
        async () => {
          await page.goto(web);
          await page
            .getByRole("link", { name: "ĐẶT LỊCH TƯ VẤN", exact: true })
            .click();
          await page.waitForURL("**/appointments");
          await page.getByLabel("Họ và tên", { exact: false }).fill(body.name);
          const emailInput = page.getByLabel("Email", { exact: true });
          for (const invalidEmail of [
            "khong-hop-le",
            "ten@gmail",
            "ten..ban@gmail.com",
            "ten@g_mail.com",
          ]) {
            await emailInput.fill(invalidEmail);
            await emailInput.blur();
            await expect(
              page.locator("#appointment-email-error"),
            ).toContainText("định dạng");
            assert.equal(
              await emailInput.evaluate((input) => input.checkValidity()),
              false,
            );
          }
          await emailInput.fill("ten.ban+salon@example.com");
          await emailInput.blur();
          assert.equal(
            await emailInput.evaluate((input) => input.checkValidity()),
            true,
          );
          await expect(page.locator("#appointment-email-error")).toHaveCount(0);
          await emailInput.fill("browser@example.com");
          await page
            .getByLabel("Số điện thoại", { exact: false })
            .fill(body.phone);
          await page
            .getByLabel("Salon", { exact: false })
            .selectOption("hanoi");
          const dateInput = page.getByLabel("Ngày tư vấn", { exact: true });
          const yesterday = new Date(Date.now() + 7 * 3600000 - 86400000)
            .toISOString()
            .slice(0, 10)
            .split("-")
            .reverse()
            .join("/");
          await dateInput.fill(yesterday);
          await expect(page.locator("#appointment-date-error")).toContainText(
            "quá khứ",
          );
          assert.equal(
            await dateInput.evaluate((input) => input.checkValidity()),
            false,
          );
          await dateInput.fill("31/02/2027");
          await expect(page.locator("#appointment-date-error")).toContainText(
            "ngày hợp lệ",
          );
          await dateInput.fill(date.split("-").reverse().join("/"));
          await expect(dateInput).toHaveValue(
            date.split("-").reverse().join("/"),
          );
          assert.equal(
            await dateInput.evaluate((input) => input.checkValidity()),
            true,
          );
          await page
            .getByLabel("Khung giờ", { exact: false })
            .selectOption("15:00");
          await page.getByLabel("Nhu cầu tư vấn").selectOption(body.interest);
          await page.getByLabel("Ngân sách dự kiến").selectOption(body.budget);
          await page.getByLabel("Lời nhắn cho chuyên viên").fill(body.notes);
          await page.getByRole("button", { name: "XÁC NHẬN ĐẶT LỊCH" }).click();
          await expect(
            page.getByRole("heading", { name: "Đặt lịch hẹn thành công" }),
          ).toBeVisible();
          await expect(page.locator(".appointment-ticket")).toContainText(
            "Hà Nội",
          );
          await expect(page.locator(".appointment-ticket")).toContainText(
            "15:00",
          );
          await expect(page.locator(".appointment-ticket")).toContainText(
            date.split("-").reverse().join("/"),
          );
          await expect(page.locator(".appointment-ticket")).toContainText(
            body.notes,
          );
          await expect(page.locator(".appointment-email")).toContainText(
            "browser@example.com",
          );
          const code = await page
            .locator(".appointment-ticket-head strong")
            .textContent();
          await page.reload();
          await expect(
            page.locator(".appointment-ticket-head strong"),
          ).toHaveText(code);
          assert.deepEqual(messages.at(-1).to, ["browser@example.com"]);
        },
      );
      await t.test("form and confirmation fit mobile viewport", async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        for (const route of [new URL(page.url()).pathname, "/appointments"]) {
          await page.goto(web + route);
          await page.locator("main h1").waitFor();
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
        }
        assert.deepEqual(errors, []);
      });
      await t.test("booking creation is rate limited", async () => {
        await api("", {
          body: { ...body, bookingToken: randomUUID() },
          status: 201,
        });
        await api("", {
          body: { ...body, bookingToken: randomUUID() },
          status: 429,
        });
      });
    } finally {
      if (browser) await browser.close();
      if (vite && vite.exitCode === null) {
        const stopped = new Promise((resolve) => vite.once("exit", resolve));
        vite.kill();
        await stopped;
      }
      if (http) await new Promise((resolve) => http.close(resolve));
      await mongoose.disconnect();
      if (mongo) await mongo.stop();
      await new Promise((resolve) => smtp.close(resolve));
    }
  },
);
