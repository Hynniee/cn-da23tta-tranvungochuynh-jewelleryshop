import mongoose from "mongoose";
import Product from "../models/Product.js";
import UserPreference from "../models/UserPreference.js";
import { predictInterest } from "./ml.service.js";
import {
  activeProductPromotions,
  promotedProduct,
} from "./promotion.service.js";
import { clamp, resolveWeights, scoreCriteria } from "./dss.service.js";

const norm = (map: any, key: string) => {
  const values = map instanceof Map ? Object.fromEntries(map) : map || {};
  return Object.keys(values).length
    ? Number(values[key] || 0) /
        Math.max(1, ...Object.values(values).map(Number))
    : 0.5;
};
export async function recommend(userId: string, limit = 8, criteria: any = {}) {
  for (const key of ["budgetMin", "budgetMax"]) {
    if (
      criteria[key] !== undefined &&
      (!Number.isFinite(criteria[key]) || criteria[key] < 0)
    )
      throw Object.assign(new Error("Ngân sách không hợp lệ"), { status: 400 });
  }
  if (
    criteria.budgetMin &&
    criteria.budgetMax &&
    criteria.budgetMin > criteria.budgetMax
  )
    throw Object.assign(new Error("Khoảng ngân sách không hợp lệ"), {
      status: 400,
    });
  const weights = resolveWeights(criteria);
  const [pref, products] = await Promise.all([
    mongoose.isValidObjectId(userId)
      ? UserPreference.findOne({ user: userId }).lean()
      : Promise.resolve(null),
    Product.find({ stock: { $gt: 0 } }).lean(),
  ]);
  const promotions = await activeProductPromotions();
  return products
    .map((p) => promotedProduct(p, promotions))
    .filter(
      (p: any) =>
        (!criteria.budgetMax ||
          (p.salePrice ?? p.price) <= criteria.budgetMax) &&
        (!criteria.budgetMin ||
          (p.salePrice ?? p.price) >= criteria.budgetMin) &&
        (!criteria.category || p.category === criteria.category) &&
        (!criteria.material || p.material === criteria.material) &&
        (!criteria.stone || p.stone === criteria.stone) &&
        (!criteria.excludeStone || p.stone !== criteria.excludeStone),
    )
    .map((p: any) => {
      const price = p.salePrice ?? p.price;
      const target = criteria.budgetMax
        ? (Number(criteria.budgetMin || 0) + criteria.budgetMax) / 2
        : pref?.priceMax || price;
      const priceFit = clamp(
        1 - Math.abs(price - target) / Math.max(target, 1),
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
      const scored = scoreCriteria(
        {
          category: categoryMatch,
          material: materialMatch,
          price: priceFit,
          style: styleMatch,
          occasion: criteria.occasion
            ? Number(p.occasion?.includes(criteria.occasion))
            : 0.5,
          rating,
        },
        weights,
      );
      const mlScore = predictInterest({
        categoryMatch,
        materialMatch,
        styleMatch,
        priceFit,
        rating,
      });
      return {
        ...p,
        ...scored,
        mlScore: mlScore === null ? null : Math.round(mlScore * 100),
        recommendationMode: "contextual-dss",
        reasons: scored.scoreParts
          .filter((part) => part.value >= 0.7 && part.weight > 0)
          .sort((a, b) => b.contribution - a.contribution)
          .slice(0, 3)
          .map(
            (part) =>
              `${part.label}: ${Math.round(part.value * 100)}/100, đóng góp ${part.contribution.toFixed(1)} điểm`,
          ),
      };
    })
    .sort(
      (a, b) =>
        b.rankingValue - a.rankingValue ||
        (a.salePrice ?? a.price) - (b.salePrice ?? b.price) ||
        String(a._id).localeCompare(String(b._id)),
    )
    .slice(
      0,
      Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 8,
    )
    .map(({ rankingValue, ...product }) => product);
}
