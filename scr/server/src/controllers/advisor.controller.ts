import type { RequestHandler } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { extractIntent, explain } from "../services/gemini.service.js";
import { recommend } from "../services/recommendation.service.js";
import { rebuildPreference } from "../services/preference.service.js";
import AIConversation from "../models/AIConversation.js";

export const advise: RequestHandler = async (req: AuthRequest, res) => {
  const started = Date.now(),
    message = String(req.body.message || "").trim();
  if (!message)
    return res.status(400).json({ message: "Vui lòng nhập nhu cầu" });
  await rebuildPreference(req.user!.id);
  const intent = await extractIntent(message);
  const products = await recommend(req.user!.id, 5, intent);
  const answer = await explain(message, products);
  await AIConversation.create({
    user: req.user!.id,
    message,
    intent,
    answer,
    recommendedProducts: products.map((p: any) => p._id),
    latencyMs: Date.now() - started,
  });
  res.json({ intent, answer, products });
};
