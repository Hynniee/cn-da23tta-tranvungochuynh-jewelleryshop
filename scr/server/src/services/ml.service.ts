import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export type MLFeatures = {
  categoryMatch: number;
  materialMatch: number;
  styleMatch: number;
  priceFit: number;
  rating: number;
};
type Model = {
  type: string;
  features: string[];
  coefficients: number[];
  intercept: number;
  trainingSamples: number;
};
const keys: (keyof MLFeatures)[] = [
  "categoryMatch",
  "materialMatch",
  "styleMatch",
  "priceFit",
  "rating",
];
let cached: Model | null | undefined;
function load(): Model | null {
  if (cached !== undefined) return cached;
  const paths = [
    process.env.ML_MODEL_PATH,
    fileURLToPath(new URL("../ml/model.json", import.meta.url)),
    path.resolve(process.cwd(), "src/ml/model.json"),
    path.resolve(process.cwd(), "dist/ml/model.json"),
  ].filter(Boolean) as string[];
  for (const p of paths) {
    try {
      const x = JSON.parse(fs.readFileSync(p, "utf8")) as Model;
      if (
        x.type === "logistic-regression" &&
        JSON.stringify(x.features) === JSON.stringify(keys) &&
        x.coefficients.length === keys.length &&
        x.coefficients.every(Number.isFinite) &&
        Number.isFinite(x.intercept)
      ) {
        cached = x;
        return x;
      }
    } catch {
      /* missing model: fallback to DSS */
    }
  }
  cached = null;
  return null;
}
export function predictInterest(f: MLFeatures): number | null {
  const m = load();
  if (!m) return null;
  const z = Math.max(
    -30,
    Math.min(
      30,
      m.intercept + m.coefficients.reduce((v, w, i) => v + w * f[keys[i]], 0),
    ),
  );
  return 1 / (1 + Math.exp(-z));
}
export function mlStatus() {
  const m = load();
  return {
    trained: !!m,
    model: m?.type || null,
    trainingSamples: m?.trainingSamples || 0,
  };
}
