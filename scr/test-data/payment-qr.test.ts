import assert from "node:assert/strict";
import { test } from "node:test";
import { paymentQrUrl } from "../server/src/services/payment-qr.service.js";

test("Sacombank QR includes the exact account, order total and transfer content", () => {
  const previous = { ...process.env };
  try {
    process.env.BANK_BIN = "970403";
    process.env.BANK_ACCOUNT_NO = "070126622404";
    process.env.BANK_ACCOUNT_NAME = "";
    process.env.QR_TEMPLATE = "";
    const url = new URL(paymentQrUrl(1250000, "MIRA123456"));
    assert.equal(url.pathname, "/image/970403-070126622404-compact2.png");
    assert.equal(url.searchParams.get("amount"), "1250000");
    assert.equal(url.searchParams.get("addInfo"), "MIRA123456");
    assert.equal(url.searchParams.has("accountName"), false);
    assert.throws(() => paymentQrUrl(-1, "MIRA123456"));
    assert.throws(() => paymentQrUrl(1.5, "MIRA123456"));
    process.env.QR_TEMPLATE =
      "https://example.com/qr?amount={amount}&memo={content}";
    const custom = new URL(paymentQrUrl(250000, "MIRA test & 1"));
    assert.equal(custom.searchParams.get("memo"), "MIRA test & 1");
    assert.equal(custom.searchParams.get("amount"), "250000");
  } finally {
    process.env = previous;
  }
});
