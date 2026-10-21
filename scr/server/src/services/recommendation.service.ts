import mongoose from "mongoose";
import Product from "../models/Product.js";
import UserPreference from "../models/UserPreference.js";
import { demoProducts } from "../data/demoProducts.js";
import { predictInterest } from "./ml.service.js";
const norm = (m: any, k: string) => {
  const o = m instanceof Map ? Object.fromEntries(m) : m || {};
  const mx = Math.max(1, ...Object.values(o).map(Number));
  return Number(o[k] || 0) / mx;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export async function recommend(userId: string, limit = 8, criteria: any = {}) {
  const db = mongoose.connection.readyState === 1;
  const [pref, products] = await Promise.all([
    db && mongoose.isValidObjectId(userId)
      ? UserPreference.findOne({ user: userId }).lean()
      : Promise.resolve(null),
    db
      ? Product.find({ stock: { $gt: 0 } }).lean()
      : Promise.resolve(
          demoProducts.map((p: any, i: number) => ({
            ...p,
            _id: `demo-${i + 1}`,
            images: [p.image],
            stock: 12,
          })),
        ),
  ]);
  return products
    .filter(
      (p: any) =>
        (!criteria.budgetMax ||
          (p.salePrice ?? p.price) <= Number(criteria.budgetMax)) &&
        (!criteria.budgetMin ||
          (p.salePrice ?? p.price) >= Number(criteria.budgetMin)) &&
        (!criteria.category || p.category === criteria.category) &&
        (!criteria.material || p.material === criteria.material) &&
        (!criteria.stone || (p.stone || "Không đính đá") === criteria.stone) &&
        (!criteria.excludeStone || p.stone !== criteria.excludeStone),
    )
    .map((p: any) => {
      const effectivePrice = p.salePrice ?? p.price;
      const budget = Number(
        criteria.budgetMax || pref?.priceMax || effectivePrice,
      );
      const priceFit = clamp(
        1 - Math.abs(effectivePrice - budget) / Math.max(budget, 1),
      );
      const categoryMatch = criteria.category
        ? Number(p.category === criteria.category)
        : norm(pref?.categories, p.category);
      const materialMatch = criteria.material
        ? Number(p.material === criteria.material)
        : norm(pref?.materials, p.material);
      const styleMatch = criteria.style
        ? Number(p.style === criteria.style)
        : norm(pref?.styles, p.style);
      const rating = clamp(Number(p.rating || 0) / 5);
      const dssScore = clamp(
        0.25 * categoryMatch +
          0.2 * materialMatch +
          0.2 * priceFit +
          0.15 * styleMatch +
          0.15 * Math.max(categoryMatch, materialMatch, styleMatch) +
          0.05 * rating,
      );
      const mlScore = predictInterest({
        categoryMatch,
        materialMatch,
        styleMatch,
        priceFit,
        rating,
      });
      const combinedScore =
        mlScore === null ? dssScore : 0.6 * dssScore + 0.4 * mlScore;
      return {
        ...p,
        score: Math.round(combinedScore * 100),
        dssScore: Math.round(dssScore * 100),
        mlScore: mlScore === null ? null : Math.round(mlScore * 100),
        recommendationMode: mlScore === null ? "dss-fallback" : "hybrid-ml-dss",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(
      0,
      Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 8,
    );
}
