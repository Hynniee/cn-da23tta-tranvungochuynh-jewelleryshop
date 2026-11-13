import type { RequestHandler } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Order from "../models/Order.js";
import UserPreference from "../models/UserPreference.js";
import { audit } from "../services/audit.service.js";
import { AuthRequest } from "../middleware/auth.js";

const fields = "name email phone createdAt";
export const listCustomers: RequestHandler = async (req, res) => {
  const requestedPage = Number(req.query.page || 1);
  if (
    !Number.isSafeInteger(requestedPage) ||
    requestedPage < 1 ||
    requestedPage > 100000
  )
    return res.status(400).json({ message: "Số trang không hợp lệ" });
  const page = requestedPage;
  const search = String(req.query.search || "")
    .trim()
    .slice(0, 100);
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {
    role: "customer",
    ...(search
      ? {
          $or: ["name", "email", "phone"].map((key) => ({
            [key]: { $regex: escaped, $options: "i" },
          })),
        }
      : {}),
  };
  const [customers, total] = await Promise.all([
    User.find(query)
      .select(fields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 20)
      .limit(20)
      .lean(),
    User.countDocuments(query),
  ]);
  const stats = await Order.aggregate([
    { $match: { user: { $in: customers.map((c) => c._id) } } },
    {
      $group: {
        _id: "$user",
        orders: { $sum: 1 },
        spent: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$paymentStatus", "PAID"] },
                  { $ne: ["$status", "cancelled"] },
                ],
              },
              "$total",
              0,
            ],
          },
        },
      },
    },
  ]);
  const statsByUser = new Map(stats.map((entry) => [String(entry._id), entry]));
  res.json({
    customers: customers.map((customer) => {
      const stat = statsByUser.get(String(customer._id));
      return {
        ...customer,
        orders: stat?.orders || 0,
        spent: stat?.spent || 0,
      };
    }),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
  });
};
export const customerDetail: RequestHandler = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Mã khách hàng không hợp lệ" });
  const customer = await User.findOne({ _id: req.params.id, role: "customer" })
    .select(fields)
    .lean();
  if (!customer)
    return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  const [orders, preference] = await Promise.all([
    Order.find({ user: customer._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    UserPreference.findOne({ user: customer._id })
      .select("categories materials styles priceMin priceMax updatedFromEvents")
      .lean(),
  ]);
  res.json({ customer, orders, preference });
};
export const updateCustomer: RequestHandler = async (req: AuthRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Mã khách hàng không hợp lệ" });
  if (
    typeof req.body.name !== "string" ||
    !req.body.name.trim() ||
    req.body.name.length > 100 ||
    typeof req.body.phone !== "string" ||
    (req.body.phone && !/^[+\d ()-]{8,20}$/.test(req.body.phone))
  )
    return res
      .status(400)
      .json({ message: "Tên hoặc số điện thoại không hợp lệ" });
  const before = await User.findOne({ _id: req.params.id, role: "customer" })
    .select(fields)
    .lean();
  if (!before)
    return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  const customer = await User.findByIdAndUpdate(
    before._id,
    { $set: { name: req.body.name.trim(), phone: req.body.phone.trim() } },
    { new: true, runValidators: true },
  ).select(fields);
  await audit(
    req.user!.id,
    "UPDATE_CUSTOMER",
    "User",
    String(before._id),
    before,
    customer,
    req.ip,
  );
  res.json(customer);
};
