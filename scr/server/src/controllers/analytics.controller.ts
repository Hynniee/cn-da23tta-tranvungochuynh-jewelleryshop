import type { RequestHandler } from "express";
import Behavior from "../models/Behavior.js";
import RecommendationLog from "../models/RecommendationLog.js";
import AIConversation from "../models/AIConversation.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";

export const getAnalytics: RequestHandler = async (_q, res) => {
  const [events, recs, ai, paid, mismatch] = await Promise.all([
    Behavior.countDocuments(),
    RecommendationLog.countDocuments(),
    AIConversation.countDocuments(),
    Order.countDocuments({ paymentStatus: "PAID" }),
    Payment.countDocuments({ status: "MISMATCH" }),
  ]);
  const clicks = await RecommendationLog.countDocuments({
      clickedProduct: { $exists: true },
    }),
    carts = await RecommendationLog.countDocuments({ addedToCart: true }),
    purchases = await RecommendationLog.countDocuments({ purchased: true });
  res.json({
    events,
    recommendations: recs,
    aiConversations: ai,
    paidOrders: paid,
    paymentMismatches: mismatch,
    recommendationCTR: recs ? clicks / recs : 0,
    recommendationCartRate: recs ? carts / recs : 0,
    recommendationPurchaseRate: recs ? purchases / recs : 0,
  });
};
