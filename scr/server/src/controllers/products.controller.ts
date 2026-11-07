import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import {
  catalogProduct,
  productLookup,
} from "../services/product-data.service.js";
import { AuthRequest } from "../middleware/auth.js";
import { audit } from "../services/audit.service.js";

const param = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

const db = () => mongoose.connection.readyState === 1;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

export const listProducts: RequestHandler = async (req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 }).lean();
  const search = normalize(String(req.query.search || ""));
  const category = String(req.query.category || "");
  const material = String(req.query.material || "");
  const stone = String(req.query.stone || "");
  res.json(
    products
      .map(catalogProduct)
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

export const getProduct: RequestHandler = async (req, res, next) => {
  try {
    const slug = param(req.params.slug);
    const p = await Product.findOne(productLookup(slug)).lean();
    return p
      ? res.json(catalogProduct(p))
      : res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  } catch (e) {
    next(e);
  }
};

export const createProduct: RequestHandler = async (req: AuthRequest, res) => {
  if (!db())
    return res.status(503).json({ message: "Quản trị cần MongoDB Atlas" });
  const p = await Product.create(req.body);
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
  const after = await Product.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
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
