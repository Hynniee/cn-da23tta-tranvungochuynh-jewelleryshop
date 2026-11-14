import {
  reserveInventory,
  restoreInventory,
} from "../services/inventory.service.js";
import type { RequestHandler } from "express";
import { bankTransferAvailable } from "../config.js";
import storeConfig from "../data/storeConfig.json" with { type: "json" };
import { randomUUID } from "node:crypto";
import { shippingAddress } from "../services/shipping-address.service.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";
import { audit } from "../services/audit.service.js";
import { quoteOrder, PromotionError } from "../services/promotion.service.js";
import { recordPurchase } from "../services/behavior.service.js";

export const createOrder: RequestHandler = async (req: AuthRequest, res) => {
  const { items, paymentMethod, addressId } = req.body;
  let customer = req.body.customer;
  if (addressId != null) {
    if (typeof addressId !== "string" || !addressId || addressId.length > 100)
      return res.status(400).json({ message: "Địa chỉ đã lưu không hợp lệ" });
    const user = await User.findById(req.user!.id)
      .select("addresses")
      .read("primary")
      .lean();
    const saved = user?.addresses?.find((a) => a._id === addressId);
    if (!saved)
      return res.status(404).json({
        message:
          "Địa chỉ đã lưu không còn tồn tại. Vui lòng chọn lại hoặc nhập địa chỉ mới",
      });
    customer = {
      ...customer,
      name: saved.name,
      phone: saved.phone,
      provinceCode: saved.provinceCode,
      wardCode: saved.wardCode,
      addressLine: saved.addressLine,
    };
  }
  if (
    !Array.isArray(items) ||
    !items.length ||
    items.length > 100 ||
    !["COD", "BANK_QR"].includes(paymentMethod) ||
    !customer
  ) {
    return res.status(400).json({ message: "Thông tin đơn hàng không hợp lệ" });
  }
  if (typeof customer.name !== "string" || !customer.name.trim())
    return res
      .status(400)
      .json({ message: "Vui lòng nhập họ tên người nhận" });
  if (typeof customer.phone !== "string" || !customer.phone.trim())
    return res
      .status(400)
      .json({ message: "Vui lòng nhập số điện thoại người nhận" });
  if (customer.email != null && typeof customer.email !== "string")
    return res
      .status(400)
      .json({ message: "Email không hợp lệ. Bạn có thể để trống trường này" });
  const deliveryAddress = shippingAddress(customer);
  if (paymentMethod === "BANK_QR" && !bankTransferAvailable())
    return res.status(503).json({
      message:
        "Chuyển khoản chưa sẵn sàng. Vui lòng chọn thanh toán khi nhận hàng",
    });
  const calculation = await quoteOrder(
    items,
    req.body.voucherCode,
    new Date(),
    "primary",
  );
  const normalized = calculation.items;
  const quantities = new Map<
    string,
    { id: string; size: string; quantity: number }
  >();
  for (const item of normalized) {
    const id = String(item.product);
    const size = item.size || "";
    const key = JSON.stringify([id, size]);
    const previous = quantities.get(key);
    quantities.set(key, {
      id,
      size,
      quantity: (previous?.quantity || 0) + item.quantity,
    });
  }
  const { subtotal, shippingFee, discountTotal, voucher, total } = calculation;
  if (req.body.quotedTotal != null) {
    if (!Number.isSafeInteger(req.body.quotedTotal) || req.body.quotedTotal < 0)
      throw new PromotionError("Số tiền xác nhận không hợp lệ");
    if (req.body.quotedTotal !== total)
      throw new PromotionError(
        "Giá hoặc ưu đãi đã thay đổi. Vui lòng kiểm tra lại tổng tiền trước khi xác nhận đơn hàng",
        409,
      );
  }
  if (paymentMethod === "BANK_QR" && total <= 0)
    throw new PromotionError(
      "Đơn hàng miễn phí không cần chuyển khoản. Vui lòng chọn thanh toán khi nhận hàng",
    );
  const reserved: { id: string; size: string; quantity: number }[] = [];
  try {
    for (const { id, size, quantity } of quantities.values()) {
      const available = await reserveInventory(id, size, quantity);
      if (!available) {
        throw Object.assign(new Error("Sản phẩm không đủ tồn kho"), {
          status: 409,
        });
      }
      reserved.push({ id, size, quantity });
    }
    const order = await Order.create({
      orderCode: `MIRA${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
      user: req.user!.id,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: typeof customer.email === "string" ? customer.email.trim() : "",
        ...deliveryAddress,
        note: String(customer.note || "").slice(0, 1000),
      },
      items: normalized,
      subtotal,
      shippingFee,
      discountTotal,
      voucher,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === "BANK_QR" ? "PENDING" : "UNPAID",
      status: paymentMethod === "BANK_QR" ? "pending_payment" : "pending",
    });

    res.status(201).json(order);
  } catch (error) {
    await Promise.all(
      reserved.map(({ id, size, quantity }) =>
        restoreInventory(id, size, quantity),
      ),
    );
    if (error instanceof Error && "status" in error && error.status === 409)
      return res.status(409).json({ message: error.message });
    throw error;
  }
};

export const getMyOrder: RequestHandler = async (req: AuthRequest, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!.id });
  if (!order)
    return res
      .status(404)
      .json({ message: "Không tìm thấy đơn hàng trong tài khoản của bạn" });
  res.json(order);
};

export const listMyOrders: RequestHandler = async (req: AuthRequest, res) =>
  res.json(await Order.find({ user: req.user!.id }).sort({ createdAt: -1 }));

export const listOrders: RequestHandler = async (_req, res) =>
  res.json(await Order.find().sort({ createdAt: -1 }));

const updateStatus = async (
  req: AuthRequest,
  res: import("express").Response,
) => {
  const id = String(req.params.id);
  const transitions: Record<string, string[]> = storeConfig.orderTransitions;
  const before = await Order.findById(id).lean();
  const customerCancel = req.path.endsWith("/cancel");
  if (!before)
    return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
  if (customerCancel && String(before.user) !== req.user!.id)
    return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
  if (customerCancel && !["pending", "pending_payment"].includes(before.status))
    return res.status(400).json({
      message: "Đơn đã được xử lý, vui lòng liên hệ cửa hàng để được hỗ trợ",
    });
  if (customerCancel) req.body.status = "cancelled";
  const manualPaymentConfirmation =
    !customerCancel &&
    before.paymentMethod === "BANK_QR" &&
    before.paymentStatus !== "PAID" &&
    req.body.status === "confirmed";
  if (manualPaymentConfirmation && req.body.confirmPayment !== true)
    return res.status(400).json({
      message:
        "Vui lòng xác nhận đã kiểm tra và nhận đủ tiền chuyển khoản trước khi xác nhận đơn",
    });
  if (
    !customerCancel &&
    before.paymentMethod === "BANK_QR" &&
    before.paymentStatus !== "PAID" &&
    ["shipping", "delivered", "completed"].includes(req.body.status)
  )
    return res.status(400).json({
      message:
        "Đơn chuyển khoản cần được xác nhận đã thanh toán trước khi giao hoặc hoàn tất",
    });
  if (!transitions[before.status]?.includes(req.body.status))
    return res
      .status(400)
      .json({ message: "Không thể chuyển sang trạng thái này" });
  const after = await Order.findOneAndUpdate(
    { _id: id, status: before.status, paymentStatus: before.paymentStatus },
    {
      status: req.body.status,
      ...(manualPaymentConfirmation
        ? {
            paymentStatus: "PAID",
            paymentConfirmedAt: new Date(),
            paymentConfirmationMethod: "ADMIN",
          }
        : {}),
      ...(req.body.status === "completed" && before.paymentMethod === "COD"
        ? { paymentStatus: "PAID" }
        : {}),
    },
    { new: true, runValidators: true },
  );
  if (!after)
    return res
      .status(409)
      .json({ message: "Đơn hàng đã thay đổi, vui lòng tải lại" });
  if (req.body.status === "cancelled") {
    await Promise.all(
      before.items.map((item) =>
        restoreInventory(
          String(item.product),
          item.size || "",
          item.quantity || 0,
        ),
      ),
    );
  }
  await audit(
    req.user?.id,
    "UPDATE_ORDER_STATUS",
    "Order",
    id,
    before,
    after,
    req.ip,
  );
  await recordPurchase(after).catch((error) =>
    console.error("purchase behavior:", error.name),
  );
  res.json(after);
};
export { updateStatus };
