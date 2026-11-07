import type { RequestHandler } from "express";
import Diamond from "../models/Diamond.js";
import { rankDiamonds } from "../services/diamond.service.js";

export const listDiamonds: RequestHandler = async (_q, res) =>
  res.json(await Diamond.find().sort({ price: 1 }));

export const rankDiamondsForRequest: RequestHandler = async (req, res) =>
  res.json(await rankDiamonds(req.body));
