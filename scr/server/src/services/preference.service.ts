import Behavior from "../models/Behavior.js";
import UserPreference from "../models/UserPreference.js";
import { cleanIntent, extractLocalIntent } from "./gemini.service.js";
import { catalogProduct } from "./product-data.service.js";
const W: Record<string, number> = {
  VIEW: 1,
  SEARCH: 1,
  CLICK: 2,
  WISHLIST: 3,
  ADD_CART: 5,
  PURCHASE: 10,
};
export async function rebuildPreference(userId: string) {
  const events = await Behavior.find({ user: userId })
    .populate("product")
    .lean();
  const cat: Record<string, number> = {},
    mat: Record<string, number> = {},
    sty: Record<string, number> = {};
  const prices: number[] = [];
  for (const e of events) {
    const w = W[e.type] || 1;
    if (e.type === "SEARCH" && e.query) {
      const intent = cleanIntent(extractLocalIntent(e.query));
      if (intent.category)
        cat[intent.category] = (cat[intent.category] || 0) + w;
      if (intent.material)
        mat[intent.material] = (mat[intent.material] || 0) + w;
      if (intent.style) sty[intent.style] = (sty[intent.style] || 0) + w;
      if (intent.budgetMax) prices.push(intent.budgetMax);
      continue;
    }
    if (!e.product) continue;
    const p = catalogProduct(e.product);
    if (p.category) cat[p.category] = (cat[p.category] || 0) + w;
    if (p.material) mat[p.material] = (mat[p.material] || 0) + w;
    if (p.style) sty[p.style] = (sty[p.style] || 0) + w;
    const price = Number(p.salePrice ?? p.price);
    if (Number.isFinite(price) && price > 0) prices.push(price);
  }
  return UserPreference.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      categories: cat,
      materials: mat,
      styles: sty,
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
      updatedFromEvents: events.length,
    },
    { upsert: true, new: true },
  );
}
