import mongoose from "mongoose";
import { demoDiamonds } from "../data/demoDiamonds.js";
import Diamond from "../models/Diamond.js";
const CUT = ["Fair", "Good", "Very Good", "Excellent"];
const COLOR = [
  "Z",
  "Y",
  "X",
  "W",
  "V",
  "U",
  "T",
  "S",
  "R",
  "Q",
  "P",
  "O",
  "N",
  "M",
  "L",
  "K",
  "J",
  "I",
  "H",
  "G",
  "F",
  "E",
  "D",
];
const CLARITY = [
  "I3",
  "I2",
  "I1",
  "SI2",
  "SI1",
  "VS2",
  "VS1",
  "VVS2",
  "VVS1",
  "IF",
  "FL",
];
const n = (a: string[], v: string) =>
  Math.max(0, a.indexOf(v)) / (a.length - 1);
export async function rankDiamonds(input: any) {
  const w = {
    carat: Number(input.weights?.carat ?? 0.4),
    cut: Number(input.weights?.cut ?? 0.3),
    color: Number(input.weights?.color ?? 0.2),
    clarity: Number(input.weights?.clarity ?? 0.1),
  };
  const max = Number(input.budgetMax ?? Number.MAX_SAFE_INTEGER);
  const ds =
    mongoose.connection.readyState === 1
      ? await Diamond.find({ price: { $lte: max }, stock: { $gt: 0 } }).lean()
      : demoDiamonds.filter((d) => d.price <= max);
  const target = Number(input.targetCarat ?? 1);
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (
    !Number.isFinite(max) ||
    max <= 0 ||
    !Number.isFinite(target) ||
    target <= 0 ||
    !Object.values(w).every((x) => Number.isFinite(x) && x >= 0) ||
    sum <= 0
  )
    throw Object.assign(new Error("Invalid ranking criteria"), { status: 400 });
  return ds
    .map((d: any) => {
      const carat = Math.max(
        0,
        1 - Math.abs(d.carat - target) / Math.max(target, 1),
      );
      const score =
        carat * w.carat +
        n(CUT, d.cut) * w.cut +
        n(COLOR, d.color) * w.color +
        n(CLARITY, d.clarity) * w.clarity;
      return { ...d, score: Math.round((score / sum) * 100) };
    })
    .sort((a, b) => b.score - a.score);
}
