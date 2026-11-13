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
export function diamondCriteria(message: string, previous: any = {}) {
  const next: any = {
    targetCarat: previous.targetCarat,
    weights: {
      carat: 0.4,
      cut: 0.3,
      color: 0.2,
      clarity: 0.1,
      ...previous.weights,
    },
  };
  const carat = message.match(/(\d+(?:[.,]\d+)?)\s*(?:carat|ct)\b/i);
  if (carat) next.targetCarat = Number(carat[1].replace(",", "."));
  const priority = message
    .match(
      /ưu tiên\s+(carat|trọng lượng|cut|giác cắt|color|màu|clarity|độ tinh khiết)/i,
    )?.[1]
    .toLowerCase();
  if (priority) {
    const key = /carat|trọng/.test(priority)
      ? "carat"
      : /cut|giác/.test(priority)
        ? "cut"
        : /color|màu/.test(priority)
          ? "color"
          : "clarity";
    next.weights = {
      carat: 0.15,
      cut: 0.15,
      color: 0.15,
      clarity: 0.15,
      [key]: 0.55,
    };
  }
  return next;
}
export async function rankDiamonds(input: any) {
  const w = {
    carat: Number(input.weights?.carat ?? 0.4),
    cut: Number(input.weights?.cut ?? 0.3),
    color: Number(input.weights?.color ?? 0.2),
    clarity: Number(input.weights?.clarity ?? 0.1),
  };
  const max = Number(input.budgetMax ?? Number.MAX_SAFE_INTEGER);
  const target = Number(input.targetCarat ?? 1);
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (
    !Number.isFinite(max) ||
    max <= 0 ||
    !Number.isFinite(target) ||
    target <= 0 ||
    !Object.values(w).every((x) => Number.isFinite(x) && x >= 0) ||
    !Number.isFinite(sum) ||
    sum <= 0
  )
    throw Object.assign(new Error("Invalid ranking criteria"), { status: 400 });
  const ds = await Diamond.find({
    price: { $lte: max },
    stock: { $gt: 0 },
  }).lean();
  return ds
    .map((d: any) => {
      const carat = Math.max(
        0,
        1 - Math.abs(d.carat - target) / Math.max(target, 1),
      );
      const values = {
        carat,
        cut: n(CUT, d.cut),
        color: n(COLOR, d.color),
        clarity: n(CLARITY, d.clarity),
      };
      const scoreParts = (Object.keys(w) as (keyof typeof w)[]).map(
        (criterion) => ({
          criterion,
          label: criterion,
          value: values[criterion],
          weight: w[criterion] / sum,
          contribution: ((values[criterion] * w[criterion]) / sum) * 100,
        }),
      );
      const total = scoreParts.reduce((s, part) => s + part.contribution, 0);
      return {
        ...d,
        score: Math.round(total),
        rankingValue: total,
        scoreParts,
        weights: Object.fromEntries(
          Object.entries(w).map(([key, value]) => [key, value / sum]),
        ),
      };
    })
    .sort((a, b) => b.rankingValue - a.rankingValue || a.price - b.price)
    .slice(
      0,
      Number.isFinite(input.limit)
        ? Math.max(1, Math.min(50, Math.floor(input.limit)))
        : 5,
    )
    .map(({ rankingValue, ...diamond }) => diamond);
}
