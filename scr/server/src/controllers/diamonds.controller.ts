import type { RequestHandler } from "express";
import Diamond from "../models/Diamond.js";
import { rankDiamonds } from "../services/diamond.service.js";
import mongoose from "mongoose";

export const listDiamonds: RequestHandler = async (_q, res) =>
  res.json(await Diamond.find().sort({ price: 1 }));

export const rankDiamondsForRequest: RequestHandler = async (req, res) =>
  res.json(await rankDiamonds(req.body));

export const getDiamond: RequestHandler = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Mã kim cương không hợp lệ" });
  const diamond = await Diamond.findById(req.params.id).lean();
  if (!diamond)
    return res.status(404).json({ message: "Không tìm thấy kim cương" });
  res.json(diamond);
};
