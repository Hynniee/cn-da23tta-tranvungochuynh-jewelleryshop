import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.js";
import { rebuildPreference } from "../services/preference.service.js";
import { recommend } from "../services/recommendation.service.js";
import { mlStatus } from "../services/ml.service.js";
import RecommendationLog from "../models/RecommendationLog.js";

export const getMLStatus: RequestHandler = (_req, res) => res.json(mlStatus());

export const getDemoRecommendations: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const criteria = {
      budgetMax: Number(req.query.budgetMax || 0) || undefined,
      category: String(req.query.category || ""),
      stone: String(req.query.stone || ""),
      material: String(req.query.material || ""),
      style: String(req.query.style || ""),
    };
    res.json({
      products: await recommend("demo", Number(req.query.limit || 3), criteria),
      ...mlStatus(),
    });
  } catch (e) {
    next(e);
  }
};

export const getRecommendations: RequestHandler = async (
  req: AuthRequest,
  res,
  next,
) => {
  try {
    if (mongoose.connection.readyState !== 1)
      return res.json({
        products: await recommend(req.user!.id, Number(req.query.limit || 8)),
        ...mlStatus(),
      });
    await rebuildPreference(req.user!.id);
    const products = await recommend(
      req.user!.id,
      Number(req.query.limit || 8),
    );
    const log = await RecommendationLog.create({
      user: req.user!.id,
      productIds: products.map((p: any) => p._id),
    });
    res.json({ recommendationId: log._id, products, ...mlStatus() });
  } catch (e) {
    next(e);
  }
};

export const saveFeedback: RequestHandler = async (
  req: AuthRequest,
  res,
  next,
) => {
  try {
    if (mongoose.connection.readyState !== 1)
      return res.status(503).json({ message: "Cần MongoDB để lưu feedback" });
    const { clickedProduct, addedToCart, purchased } = req.body;
    const log = await RecommendationLog.findOneAndUpdate(
      { _id: req.params.id, user: req.user!.id },
      {
        $set: {
          ...(clickedProduct ? { clickedProduct } : {}),
          ...(typeof addedToCart === "boolean" ? { addedToCart } : {}),
          ...(typeof purchased === "boolean" ? { purchased } : {}),
        },
      },
      { runValidators: true },
    );
    if (!log)
      return res.status(404).json({ message: "Không tìm thấy phiên gợi ý" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
