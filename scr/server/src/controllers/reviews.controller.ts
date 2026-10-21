import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import { AuthRequest } from "../middleware/auth.js";
import { demoProducts } from "../data/demoProducts.js";

const slugOf = (req: AuthRequest) => String(req.params.slug);

const purchased = (user: string, product: mongoose.Types.ObjectId) =>
  Order.findOne({
    user,
    "items.product": product,
    status: "completed",
    paymentStatus: { $ne: "REFUNDED" },
  })
    .select("_id")
    .lean();

export const listReviews: RequestHandler = async (req: AuthRequest, res) => {
  if (mongoose.connection.readyState !== 1) {
    if (!demoProducts.some((p) => p.slug === slugOf(req)))
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    return res.json({
      reviews: [],
      total: 0,
      average: 0,
      page: 1,
      pages: 1,
      canReview: false,
      hasReviewed: false,
    });
  }
  const product = await Product.findOne({ slug: slugOf(req) })
    .select("_id")
    .lean();
  if (!product)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  const match = { product: product._id };
  const stats = await Review.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: 1 }, average: { $avg: "$rating" } } },
  ]);
  const total = stats[0]?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 10));
  const requestedPage = Number(req.query.page);
  const page = Math.min(
    pages,
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1,
  );
  const [reviews, existing, order] = await Promise.all([
    Review.find(match)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 10)
      .limit(10)
      .populate("user", "name")
      .lean(),
    req.user ? Review.exists({ ...match, user: req.user.id }) : null,
    req.user ? purchased(req.user.id, product._id) : null,
  ]);
  // Public responses expose only the review author's name, never user/order identifiers.
  res.set("Cache-Control", "private, no-store").json({
    reviews: reviews.map((review) => ({
      _id: review._id,
      name:
        (review.user as unknown as { name?: string } | null)?.name ||
        "Khách hàng MIRA",
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    })),
    total,
    average: stats[0]?.average || 0,
    page,
    pages,
    canReview: !!order && !existing,
    hasReviewed: !!existing,
  });
};

export const createReview: RequestHandler = async (req: AuthRequest, res) => {
  const { rating, comment } = req.body;
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    typeof comment !== "string" ||
    !comment.trim() ||
    comment.trim().length > 2000
  )
    return res.status(400).json({
      message: "Chọn từ 1 đến 5 sao và nhập nội dung từ 1 đến 2.000 ký tự.",
    });
  const product = await Product.findOne({ slug: slugOf(req) })
    .select("_id")
    .lean();
  if (!product)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  const order = await purchased(req.user!.id, product._id);
  if (!order)
    return res.status(403).json({
      message: "Bạn chỉ được đánh giá sản phẩm trong đơn hàng đã hoàn tất.",
    });
  try {
    const review = await Review.create({
      product: product._id,
      user: req.user!.id,
      order: order._id,
      rating,
      comment: comment.trim(),
    });
    return res.status(201).json({ _id: review._id });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      return res.status(409).json({ message: "Bạn đã đánh giá sản phẩm này." });
    throw error;
  }
};
