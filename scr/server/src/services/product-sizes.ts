// Store size options shared by catalog responses, checkout validation and the UI.
// Explicit product sizes always take priority over category presets.
import { ringSizeChart } from "./ring-sizes.js";
export type SizedProduct = { category?: string; sizes?: readonly string[] };
const ringSizes = ringSizeChart.map((row) => String(row.size));
const lengths = (values: number[]) => values.map((value) => `${value} cm`);
const presets: Record<string, readonly string[]> = {
  Nhẫn: ringSizes,
  "Nhẫn cưới": ringSizes,
  "Dây chuyền": lengths([40, 45, 50, 55, 60]),
  "Vòng tay": lengths([16, 17, 18, 19, 20]),
  "Lắc tay": lengths([16, 17, 18, 19, 20]),
  "Lắc chân": lengths([20, 22, 24, 26]),
  "Kiềng cổ": lengths([40, 42, 45]),
};
export function isGenericSize(value: unknown) {
  if (typeof value !== "string") return false;
  const text = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, " ");
  return [
    "tieu chuan",
    "size tieu chuan",
    "standard",
    "default",
    "one size",
    "onesize",
    "free size",
    "freesize",
    "mot kich thuoc",
  ].includes(text);
}
export function defaultProductSizes(category?: string): string[] {
  return [...(presets[category || ""] || [])];
}
export function productSizes(product: SizedProduct): string[] {
  const explicit = Array.isArray(product.sizes)
    ? [
        ...new Set(
          product.sizes
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value && !isGenericSize(value)),
        ),
      ]
    : [];
  return explicit.length ? explicit : defaultProductSizes(product.category);
}
