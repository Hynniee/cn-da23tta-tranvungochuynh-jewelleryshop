import Product from "../models/Product.js";
import User from "../models/User.js";
import type { RequestHandler } from "express";
import Behavior from "../models/Behavior.js";
import RecommendationLog from "../models/RecommendationLog.js";
import AIConversation from "../models/AIConversation.js";
import Order from "../models/Order.js";
import { unresolvedPaymentMismatches } from "../services/payment-status.service.js";

export const getAnalytics: RequestHandler = async (_q, res) => {
  const [events, recs, ai, paid, mismatch] = await Promise.all([
    Behavior.countDocuments(),
    RecommendationLog.countDocuments(),
    AIConversation.countDocuments(),
    Order.countDocuments({ paymentStatus: "PAID" }),
    unresolvedPaymentMismatches(),
  ]);
  const clicks = await RecommendationLog.countDocuments({
      clickedProduct: { $exists: true },
    }),
    carts = await RecommendationLog.countDocuments({ addedToCart: true }),
    purchases = await RecommendationLog.countDocuments({ purchased: true });
  const [
    orderSummary,
    statusCounts,
    monthlyRevenue,
    bestSellers,
    stockSummary,
    customerCount,
  ] = await Promise.all([
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", "PAID"] },
                    { $ne: ["$status", "cancelled"] },
                  ],
                },
                "$total",
                0,
              ],
            },
          },
          revenueOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", "PAID"] },
                    { $ne: ["$status", "cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { paymentStatus: "PAID", status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]),
    Order.aggregate([
      { $match: { status: "completed" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $last: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
    Product.aggregate([
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          units: { $sum: "$stock" },
          lowStock: { $sum: { $cond: [{ $lte: ["$stock", 5] }, 1, 0] } },
          soldOut: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
        },
      },
    ]),
    User.countDocuments({ role: "customer" }),
  ]);
  const summary = orderSummary[0] || {
    totalOrders: 0,
    revenue: 0,
    revenueOrders: 0,
  };
  res.json({
    commerce: {
      ...summary,
      averageOrderValue: summary.revenueOrders
        ? summary.revenue / summary.revenueOrders
        : 0,
      statusCounts,
      monthlyRevenue,
      bestSellers,
      inventory: stockSummary[0] || {
        products: 0,
        units: 0,
        lowStock: 0,
        soldOut: 0,
      },
      customerCount,
    },
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
