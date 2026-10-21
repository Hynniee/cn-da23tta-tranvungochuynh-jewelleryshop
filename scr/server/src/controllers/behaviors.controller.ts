import type { RequestHandler } from "express";
import Behavior from "../models/Behavior.js";
import { AuthRequest } from "../middleware/auth.js";
import { rebuildPreference } from "../services/preference.service.js";

export const recordBehavior: RequestHandler = async (req: AuthRequest, res) => {
  const event = await Behavior.create({ ...req.body, user: req.user?.id });
  if (req.user?.id) await rebuildPreference(req.user.id);
  res.status(201).json({ ok: true, id: event._id });
};

export const getPreference: RequestHandler = async (req: AuthRequest, res) =>
  res.json(await rebuildPreference(req.user!.id));
