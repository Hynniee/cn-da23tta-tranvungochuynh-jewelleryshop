import type { RequestHandler } from "express";
import Behavior from "../models/Behavior.js";
import { AuthRequest } from "../middleware/auth.js";
import { rebuildPreference } from "../services/preference.service.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";
import { productLookup } from "../services/product-data.service.js";

export const recordBehavior: RequestHandler = async (req: AuthRequest, res) => {
  const { type, product, productSlug, query, sessionId, eventId } = req.body;
  if (
    !["VIEW", "SEARCH", "CLICK", "WISHLIST", "ADD_CART"].includes(type) ||
    (sessionId !== undefined &&
      (typeof sessionId !== "string" || sessionId.length > 100)) ||
    (eventId !== undefined &&
      (typeof eventId !== "string" || !/^[0-9a-f-]{36}$/i.test(eventId)))
  )
    return res.status(400).json({ message: "Hành vi không hợp lệ" });
  let productId = product;
  if (
    productSlug &&
    typeof productSlug === "string" &&
    productSlug.length <= 200
  )
    productId = (
      await Product.findOne(productLookup(productSlug)).select("_id").lean()
    )?._id;
  if (type === "SEARCH") {
    if (typeof query !== "string" || !query.trim() || query.length > 500)
      return res.status(400).json({ message: "Từ khóa tìm kiếm không hợp lệ" });
    productId = undefined;
  } else if (
    !mongoose.isValidObjectId(productId) ||
    !(await Product.exists({ _id: productId }))
  )
    return res.status(400).json({ message: "Sản phẩm không hợp lệ" });
  const eventKey = eventId
    ? `${req.user?.id || sessionId || "guest"}:${eventId}`
    : undefined;
  const payload = {
    type,
    product: productId,
    query: type === "SEARCH" ? query.trim() : undefined,
    sessionId,
    user: req.user?.id,
    ...(eventKey ? { eventKey } : {}),
  };
  const event = eventKey
    ? await Behavior.findOneAndUpdate(
        { eventKey },
        { $setOnInsert: payload },
        { upsert: true, new: true, runValidators: true },
      )
    : await Behavior.create(payload);
  if (req.user?.id) await rebuildPreference(req.user.id);
  res.status(201).json({ ok: true, id: event._id });
};

export const getPreference: RequestHandler = async (req: AuthRequest, res) =>
  res.json(await rebuildPreference(req.user!.id));
