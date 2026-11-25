import { inventoryInput } from "../services/inventory.service.js";
import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import {
  catalogProduct,
  productLookup,
} from "../services/product-data.service.js";
import { AuthRequest } from "../middleware/auth.js";
import { audit } from "../services/audit.service.js";
import {
  activeProductPromotions,
  promotedProduct,
} from "../services/promotion.service.js";

const param = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

const db = () => mongoose.connection.readyState === 1;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

export const homeHighlights: RequestHandler = async (_req, res) => {
  const [sales, reviews] = await Promise.all([
    Order.aggregate([
      { $match: { status: "completed", paymentStatus: { $ne: "REFUNDED" } } },
      { $unwind: "$items" },
      {
        $match: {
          "items.product": { $ne: null },
          "items.quantity": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$items.product",
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { quantity: -1, _id: 1 } },
    ]),
    Review.find({})
      .sort({ createdAt: -1, _id: -1 })
      .limit(3)
      .populate("user", "name")
      .populate("product", "name slug")
      .lean(),
  ]);
  res.json({
    sales: sales.map((item) => ({
      product: String(item._id),
      quantity: item.quantity,
    })),
    reviews: reviews.map((review) => ({
      id: String(review._id),
      name:
        (review.user as unknown as { name?: string } | null)?.name ||
        "Khách hàng MIRA",
      product: review.product
        ? {
            name: (review.product as unknown as { name?: string }).name,
            slug:
              (review.product as unknown as { slug?: string; _id: unknown })
                .slug ||
              String((review.product as unknown as { _id: unknown })._id),
          }
        : null,
      rating: review.rating,
      comment: review.comment,
    })),
  });
};

export const listProducts: RequestHandler = async (req, res) => {
  const products = await Product.find({ visible: { $ne: false } })
    .sort({ createdAt: -1 })
    .lean();
  const now = new Date();
  const promotions = await activeProductPromotions(now);
  const search = normalize(String(req.query.search || ""));
  const category = String(req.query.category || "");
  const material = String(req.query.material || "");
  const stone = String(req.query.stone || "");
  res.json(
    products
      .map((product) => promotedProduct(product, promotions, now))
      .filter(
        (p) =>
          (!category || p.category === category) &&
          (!material || p.material === material) &&
          (!stone || p.stone === stone) &&
          (!search ||
            normalize(
              `${p.name} ${p.description || ""} ${p.material} ${p.stone || ""} ${p.category}`,
            ).includes(search)),
      ),
  );
};

export const listAdminProducts: RequestHandler = async (_req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 }).lean();
  const now = new Date();
  const promotions = await activeProductPromotions(now);
  res.json(
    products.map((product) => promotedProduct(product, promotions, now)),
  );
};

export const featureAllProducts: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  const result = await Product.updateMany({}, { $set: { featured: true } });
  await audit(
    req.user?.id,
    "FEATURE_ALL_PRODUCTS",
    "Product",
    "all",
    null,
    { matched: result.matchedCount, updated: result.modifiedCount },
    req.ip,
  );
  res.json({ matched: result.matchedCount, updated: result.modifiedCount });
};

export const getProduct: RequestHandler = async (req, res, next) => {
  try {
    const slug = param(req.params.slug);
    const p = await Product.findOne({
      $and: [productLookup(slug), { visible: { $ne: false } }],
    }).lean();
    return p
      ? res.json(promotedProduct(p, await activeProductPromotions()))
      : res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  } catch (e) {
    next(e);
  }
};

export const createProduct: RequestHandler = async (req: AuthRequest, res) => {
  if (!db())
    return res.status(503).json({ message: "Quản trị cần MongoDB Atlas" });
  const p = await Product.create(inventoryInput(req.body));
  await audit(
    req.user?.id,
    "CREATE_PRODUCT",
    "Product",
    String(p._id),
    null,
    p,
    req.ip,
  );
  res.status(201).json(p);
};

export const updateProduct: RequestHandler = async (req: AuthRequest, res) => {
  if (!db())
    return res.status(503).json({ message: "Quản trị cần MongoDB Atlas" });
  const id = param(req.params.id);
  const before = await Product.findById(id).lean();
  if (!before)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  const after = await Product.findByIdAndUpdate(
    id,
    inventoryInput(req.body, before),
    {
      new: true,
      runValidators: true,
    },
  );
  await audit(
    req.user?.id,
    "UPDATE_PRODUCT",
    "Product",
    id,
    before,
    after,
    req.ip,
  );
  if (!after)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  res.json(catalogProduct(after.toObject()));
};

export const deleteProduct: RequestHandler = async (req: AuthRequest, res) => {
  if (!db())
    return res.status(503).json({ message: "Quản trị cần MongoDB Atlas" });
  const id = param(req.params.id);
  const before = await Product.findById(id).lean();
  await Product.findByIdAndDelete(id);
  await audit(
    req.user?.id,
    "DELETE_PRODUCT",
    "Product",
    id,
    before,
    null,
    req.ip,
  );
  res.status(204).end();
};
