import assert from "node:assert/strict";
import { test } from "node:test";
import {
  estimateRingSize,
  matchJewelry,
} from "../client/src/lib/personal-tools.js";
import type { Product } from "../client/src/types/product.js";
test("ring size agrees for circumference and diameter and rounds between sizes upwards", () => {
  assert.equal(estimateRingSize("17", "diameter").size, 12);
  assert.equal(
    estimateRingSize(String(17 * Math.PI), "circumference").size,
    12,
  );
  assert.equal(estimateRingSize("16,8", "diameter").size, 12);
  assert.equal(estimateRingSize("20", "diameter").size, null);
  assert.equal(estimateRingSize("14", "diameter").size, null);
  for (const value of ["", "0", "-2", "NaN", "17abc", "10000"])
    assert.throws(() => estimateRingSize(value, "diameter"));
});
const product = (
  id: string,
  stock: number,
  price: number,
  category = "Nhẫn",
): Product => ({
  _id: id,
  slug: id,
  name: id,
  stock,
  price,
  category,
  material: "Vàng 14K",
  images: [],
});
const preferences = {
  occasion: "Cầu hôn",
  budgetMin: "1000000",
  budgetMax: "20000000",
  category: "",
  material: "Vàng 14K",
  stone: "",
  includeUnavailable: true,
};
test("quiz preserves hard filters, stock information and prioritizes occasion without invented percentages", () => {
  const rows = [
    product("cheap", 1, 500000),
    product("expensive", 1, 30000000),
    product("ring", 1, 10000000),
    product("earring", 1, 9000000, "Bông tai"),
    product("unavailable", 0, 8000000),
  ];
  const result = matchJewelry(rows, preferences);
  assert.deepEqual(
    result.map((x) => x.product._id),
    ["ring", "earring", "unavailable"],
  );
  assert.equal(result[2].product.stock, 0);
  assert.deepEqual(
    matchJewelry(rows, { ...preferences, includeUnavailable: false }).map(
      (x) => x.product._id,
    ),
    ["ring", "earring"],
  );
  assert.deepEqual(
    matchJewelry(rows, { ...preferences, category: "Bông tai" }).map(
      (x) => x.product._id,
    ),
    ["earring"],
  );
  assert.deepEqual(
    matchJewelry(rows, { ...preferences, material: "Bạc 925" }),
    [],
  );
  for (const bad of [
    { budgetMin: "20", budgetMax: "10" },
    { budgetMax: "" },
    { budgetMax: "0" },
    { budgetMax: "NaN" },
  ])
    assert.throws(() => matchJewelry(rows, { ...preferences, ...bad }));
});
