import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { demoDiamonds } from "../data/demoDiamonds.js";
import Diamond from "../models/Diamond.js";
import { rankDiamonds } from "../services/diamond.service.js";

export const listDiamonds: RequestHandler = async (_q, res) =>
  res.json(
    mongoose.connection.readyState === 1
      ? await Diamond.find().sort({ price: 1 })
      : [...demoDiamonds].sort((a, b) => a.price - b.price),
  );

export const rankDiamondsForRequest: RequestHandler = async (req, res) =>
  res.json(await rankDiamonds(req.body));
