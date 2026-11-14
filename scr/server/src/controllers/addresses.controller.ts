import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import User from "../models/User.js";
import type { AuthRequest } from "../middleware/auth.js";
import { shippingAddress } from "../services/shipping-address.service.js";

type Address = {
  _id: string;
  label?: string | null;
  name: string;
  phone: string;
  provinceCode?: string | null;
  provinceName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  addressLine?: string | null;
  address?: string | null;
};
function present(user: {
  addresses?: Address[];
  defaultAddressId?: string | null;
}) {
  const addresses = user.addresses || [];
  const defaultId = addresses.some((a) => a._id === user.defaultAddressId)
    ? user.defaultAddressId
    : addresses[0]?._id;
  return addresses.map((a) => ({ ...a, isDefault: a._id === defaultId }));
}
function values(body: Record<string, unknown>) {
  for (const [field, label, max] of [
    ["name", "họ tên", 100],
    ["phone", "số điện thoại", 30],
  ] as const) {
    if (
      typeof body[field] !== "string" ||
      !body[field].trim() ||
      body[field].length > max
    )
      throw Object.assign(
        new Error(`Vui lòng nhập ${label} người nhận hợp lệ`),
        { status: 400 },
      );
  }
  if (
    body.label != null &&
    (typeof body.label !== "string" || body.label.length > 40)
  )
    throw Object.assign(new Error("Tên gợi nhớ địa chỉ không hợp lệ"), {
      status: 400,
    });
  return {
    label:
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim()
        : "Nhà riêng",
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    ...shippingAddress(body),
  };
}
// Each mutation updates one user document atomically, including its default ID.
export const listAddresses: RequestHandler = async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id)
    .select("addresses defaultAddressId")
    .lean();
  if (!user)
    return res.status(404).json({ message: "Tài khoản không tồn tại" });
  res.json(present(user));
};
export const createAddress: RequestHandler = async (req: AuthRequest, res) => {
  let address;
  try {
    address = { _id: randomUUID(), ...values(req.body) };
  } catch (e) {
    return res.status(400).json({
      message: e instanceof Error ? e.message : "Địa chỉ không hợp lệ",
    });
  }
  if (req.body.isDefault != null && typeof req.body.isDefault !== "boolean")
    return res.status(400).json({ message: "Lựa chọn mặc định không hợp lệ" });
  const user = await User.findOneAndUpdate(
    {
      _id: req.user!.id,
      $expr: { $lt: [{ $size: { $ifNull: ["$addresses", []] } }, 20] },
    },
    [
      {
        $set: {
          addresses: {
            $concatArrays: [
              { $ifNull: ["$addresses", []] },
              [{ $literal: address }],
            ],
          },
          defaultAddressId: req.body.isDefault
            ? address._id
            : { $ifNull: ["$defaultAddressId", address._id] },
        },
      },
    ],
    { new: true },
  )
    .select("addresses defaultAddressId")
    .lean();
  if (!user)
    return res
      .status(409)
      .json({ message: "Không thể thêm địa chỉ. Sổ địa chỉ tối đa 20 mục" });
  res.status(201).json(present(user));
};
export const updateAddress: RequestHandler = async (req: AuthRequest, res) => {
  let address;
  try {
    address = { _id: String(req.params.id), ...values(req.body) };
  } catch (e) {
    return res.status(400).json({
      message: e instanceof Error ? e.message : "Địa chỉ không hợp lệ",
    });
  }
  const user = await User.findOneAndUpdate(
    { _id: req.user!.id, "addresses._id": address._id },
    { $set: { "addresses.$": address } },
    { new: true, runValidators: true },
  )
    .select("addresses defaultAddressId")
    .lean();
  if (!user)
    return res
      .status(404)
      .json({ message: "Không tìm thấy địa chỉ trong tài khoản của bạn" });
  res.json(present(user));
};
export const setDefaultAddress: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  const id = String(req.params.id);
  const user = await User.findOneAndUpdate(
    { _id: req.user!.id, "addresses._id": id },
    { $set: { defaultAddressId: id } },
    { new: true },
  )
    .select("addresses defaultAddressId")
    .lean();
  if (!user)
    return res
      .status(404)
      .json({ message: "Không tìm thấy địa chỉ trong tài khoản của bạn" });
  res.json(present(user));
};
export const deleteAddress: RequestHandler = async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const user = await User.findOneAndUpdate(
    { _id: req.user!.id, "addresses._id": id },
    [
      {
        $set: {
          addresses: {
            $filter: {
              input: "$addresses",
              as: "entry",
              cond: { $ne: ["$$entry._id", { $literal: id }] },
            },
          },
        },
      },
      {
        $set: {
          defaultAddressId: {
            $cond: [
              { $eq: ["$defaultAddressId", { $literal: id }] },
              { $ifNull: [{ $arrayElemAt: ["$addresses._id", 0] }, null] },
              "$defaultAddressId",
            ],
          },
        },
      },
    ],
    { new: true },
  )
    .select("addresses defaultAddressId")
    .lean();
  if (!user)
    return res
      .status(404)
      .json({ message: "Không tìm thấy địa chỉ trong tài khoản của bạn" });
  res.json(present(user));
};
