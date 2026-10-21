import type { RequestHandler } from "express";
import { bankTransferAvailable } from "../config.js";
import storeConfig from "../data/storeConfig.json" with { type: "json" };
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { AuthRequest } from "../middleware/auth.js";
import { audit } from "../services/audit.service.js";

export const createOrder: RequestHandler = async (req: AuthRequest, res) => {
  const { items, customer, paymentMethod } = req.body;
  if (
    !Array.isArray(items) ||
    !items.length ||
    items.length > 100 ||
    !["COD", "BANK_QR"].includes(paymentMethod) ||
    !customer ||
    !["name", "phone", "email", "address"].every(
      (key) => typeof customer[key] === "string" && customer[key].trim(),
    )
  ) {
    return res.status(400).json({ message: "Thông tin đơn hàng không hợp lệ" });
  }
  if (paymentMethod === "BANK_QR" && !bankTransferAvailable())
    return res.status(503).json({
      message:
        "Chuyển khoản chưa sẵn sàng. Vui lòng chọn thanh toán khi nhận hàng.",
    });
  const normalized = [];
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (
      !item ||
      typeof item !== "object" ||
      !mongoose.isValidObjectId(item.product) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100
    ) {
      return res
        .status(400)
        .json({ message: "Sản phẩm hoặc số lượng không hợp lệ" });
    }
    const product = await Product.findById(item.product);
    const quantity = (quantities.get(item.product) || 0) + item.quantity;
    if (!product || product.stock < quantity)
      return res.status(409).json({ message: "Sản phẩm không đủ tồn kho" });
    quantities.set(item.product, quantity);
    if (product.sizes.length && !product.sizes.includes(item.size))
      return res.status(400).json({ message: "Kích cỡ không hợp lệ" });
    normalized.push({
      product: product._id,
      name: product.name,
      price: product.salePrice ?? product.price,
      quantity: item.quantity,
      size: item.size,
      image: product.images[0],
      material: product.material,
      engraving:
        product.engravingAllowed && typeof item.engraving === "string"
          ? item.engraving.slice(0, 16)
          : "",
    });
  }
  const subtotal = normalized.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shippingFee =
    subtotal >= storeConfig.freeShippingFrom ? 0 : storeConfig.shippingFee;
  const reserved: { id: string; quantity: number }[] = [];
  try {
    for (const [id, quantity] of quantities) {
      const available = await Product.findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true },
      );
      if (!available) {
        throw Object.assign(new Error("Sản phẩm không đủ tồn kho"), {
          status: 409,
        });
      }
      reserved.push({ id, quantity });
    }
    const order = await Order.create({
      orderCode: `MIRA${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
      user: req.user!.id,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim(),
        address: customer.address.trim(),
        note: String(customer.note || "").slice(0, 1000),
      },
      items: normalized,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      paymentMethod,
      paymentStatus: paymentMethod === "BANK_QR" ? "PENDING" : "UNPAID",
      status: paymentMethod === "BANK_QR" ? "pending_payment" : "pending",
    });

    res.status(201).json(order);
  } catch (error) {
    await Promise.all(
      reserved.map(({ id, quantity }) =>
        Product.updateOne({ _id: id }, { $inc: { stock: quantity } }),
      ),
    );
    if (error instanceof Error && "status" in error && error.status === 409)
      return res.status(409).json({ message: error.message });
    throw error;
  }
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
  if (!transitions[before.status]?.includes(req.body.status))
    return res
      .status(400)
      .json({ message: "Không thể chuyển sang trạng thái này" });
  const after = await Order.findOneAndUpdate(
    { _id: id, status: before.status },
    {
      status: req.body.status,
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
        Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity || 0 } },
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
  res.json(after);
};
export { updateStatus };
