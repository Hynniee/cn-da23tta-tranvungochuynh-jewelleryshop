import type { RequestHandler } from "express";
import { bankTransferAvailable } from "../config.js";
import crypto from "node:crypto";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import { AuthRequest } from "../middleware/auth.js";

export const getPaymentOptions: RequestHandler = (_req, res) =>
  res.json({ bankTransferAvailable: bankTransferAvailable() });

export const createPayment: RequestHandler = async (req: AuthRequest, res) => {
  if (!bankTransferAvailable())
    return res.status(503).json({
      message:
        "Chuyển khoản chưa sẵn sàng. Vui lòng liên hệ cửa hàng để được hỗ trợ.",
    });
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user!.id,
  });
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });
  if (
    order.paymentMethod !== "BANK_QR" ||
    order.paymentStatus === "PAID" ||
    order.status !== "pending_payment"
  ) {
    return res
      .status(409)
      .json({ message: "Đơn hàng không chờ thanh toán chuyển khoản" });
  }
  const payment = await Payment.findOneAndUpdate(
    { order: order._id },
    {
      $setOnInsert: {
        order: order._id,
        orderCode: order.orderCode,
        amountExpected: order.total,
        paymentMethod: "BANK_QR",
        status: "PENDING",
      },
    },
    { upsert: true, new: true },
  );
  const qrUrl = (process.env.QR_TEMPLATE || "")
    .replace("{amount}", String(order.total))
    .replace("{content}", encodeURIComponent(order.orderCode!));
  res.json({
    payment,
    qrUrl,
    transferContent: order.orderCode,
    amount: order.total,
    bankName: process.env.BANK_NAME || "",
    accountNo: process.env.BANK_ACCOUNT_NO || "",
    accountName: process.env.BANK_ACCOUNT_NAME || "",
  });
};

export const getOrderPayment: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user!.id,
  });
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });
  res.json({
    orderCode: order.orderCode,
    paymentStatus: order.paymentStatus,
    status: order.status,
  });
};

export const handleWebhook: RequestHandler = async (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || secret === "change_payment_webhook_secret")
    return res
      .status(503)
      .json({ message: "Chưa cấu hình xác thực thanh toán" });
  const signature = String(req.headers["x-webhook-signature"] || "");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");
  if (
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    )
  ) {
    return res.status(401).json({ message: "Sai chữ ký webhook" });
  }
  const { transactionId, amount, content, bankCode } = req.body;
  if (
    typeof transactionId !== "string" ||
    !transactionId.trim() ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    typeof content !== "string"
  ) {
    return res.status(400).json({ message: "Dữ liệu giao dịch không hợp lệ" });
  }
  if (await Payment.exists({ transactionId }))
    return res.json({ ok: true, duplicate: true });
  const order = await Order.findOne({
    orderCode: content.trim(),
    paymentMethod: "BANK_QR",
  });
  if (!order)
    return res.status(202).json({ ok: false, reason: "ORDER_NOT_FOUND" });
  if (order.paymentStatus === "PAID" || order.status !== "pending_payment")
    return res
      .status(409)
      .json({ message: "Đơn hàng không còn chờ thanh toán" });
  const exact = amount === order.total;
  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      transactionId,
      amountExpected: order.total,
      amountReceived: amount,
      orderCode: order.orderCode,
      bankCode,
      transferContent: content,
      status: exact ? "PAID" : "MISMATCH",
      paidAt: exact ? new Date() : undefined,
      rawWebhook: req.body,
    },
    { upsert: true, new: true, runValidators: true },
  );
  order.paymentStatus = exact ? "PAID" : "MISMATCH";
  if (exact) order.status = "confirmed";
  await order.save();
  res.json({ ok: true, matched: exact });
};
