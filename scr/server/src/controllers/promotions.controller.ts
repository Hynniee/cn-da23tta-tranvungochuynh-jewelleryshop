import type { RequestHandler } from "express";
import Promotion from "../models/Promotion.js";
import Product from "../models/Product.js";
import {
  promotionInput,
  PromotionError,
  quoteOrder,
} from "../services/promotion.service.js";
import { audit } from "../services/audit.service.js";
import type { AuthRequest } from "../middleware/auth.js";

export const list: RequestHandler = async (_req, res) =>
  res.json(await Promotion.find().sort({ createdAt: -1 }).lean());
async function checkedInput(body: any) {
  const value = promotionInput(body);
  if (
    value.productIds.length &&
    (await Product.countDocuments({ _id: { $in: value.productIds } })) !==
      value.productIds.length
  )
    throw new PromotionError("Có sản phẩm áp dụng không còn tồn tại");
  return value;
}
export const create: RequestHandler = async (req: AuthRequest, res) => {
  const promotion = await Promotion.create(await checkedInput(req.body));
  await audit(
    req.user?.id,
    "CREATE_PROMOTION",
    "Promotion",
    String(promotion._id),
    null,
    promotion,
    req.ip,
  );
  res.status(201).json(promotion);
};
export const update: RequestHandler = async (req: AuthRequest, res) => {
  const input = await checkedInput(req.body);
  const before = await Promotion.findById(req.params.id).lean();
  if (!before)
    return res.status(404).json({ message: "Không tìm thấy chương trình" });
  const value = await Promotion.findByIdAndUpdate(
    req.params.id,
    {
      $set: input,
      ...(input.type !== "voucher" ? { $unset: { code: 1 } } : {}),
    },
    { new: true, runValidators: true },
  );
  await audit(
    req.user?.id,
    "UPDATE_PROMOTION",
    "Promotion",
    String(req.params.id),
    before,
    value,
    req.ip,
  );
  res.json(value);
};
export const toggle: RequestHandler = async (req: AuthRequest, res) => {
  if (typeof req.body.active !== "boolean")
    throw new PromotionError("Trạng thái không hợp lệ");
  const before = await Promotion.findById(req.params.id).lean();
  if (!before)
    return res.status(404).json({ message: "Không tìm thấy chương trình" });
  const value = await Promotion.findByIdAndUpdate(
    req.params.id,
    { $set: { active: req.body.active } },
    { new: true },
  );
  await audit(
    req.user?.id,
    "TOGGLE_PROMOTION",
    "Promotion",
    String(req.params.id),
    before,
    value,
    req.ip,
  );
  res.json(value);
};
export const quote: RequestHandler = async (req, res) =>
  res.json(await quoteOrder(req.body.items, req.body.voucherCode));
