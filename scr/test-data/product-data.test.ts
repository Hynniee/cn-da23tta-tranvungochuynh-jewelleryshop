import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogProduct,
  productLookup,
} from "../server/src/services/product-data.service.js";

test("existing database fields become usable links and filters without changing data", () => {
  const source = {
    _id: "6aea812d91b4ee7f377c0d51",
    name: "Nhẫn Monako",
    metals: ["Vàng 14K"],
    gemstone: "Đá CZ",
    imageUrl: "https://example.com/ring.jpg",
    price: 9240000,
    stock: 0,
  };
  const result = catalogProduct(source);
  assert.equal(result.slug, source._id);
  assert.equal(result.material, "Vàng 14K");
  assert.equal(result.stone, "Đá CZ");
  assert.deepEqual(result.images, [source.imageUrl]);
  assert.equal(result.price, source.price);
  assert.equal(result.stock, 0);
  assert.equal(result.rating, undefined);
  assert.equal("slug" in source, false);
  assert.deepEqual(productLookup(source._id), {
    $or: [{ _id: source._id }, { slug: source._id }],
  });
  assert.deepEqual(productLookup("nhan-monako"), { slug: "nhan-monako" });
});

test("current catalog fields take priority over legacy fields", () => {
  const result = catalogProduct({
    _id: "1",
    slug: "ring",
    material: "Bạc 925",
    metals: ["Vàng 14K"],
    stone: "Ngọc trai",
    gemstone: "Đá CZ",
    images: ["/ring.jpg"],
    imageUrl: "/other.jpg",
  });
  assert.equal(result.slug, "ring");
  assert.equal(result.material, "Bạc 925");
  assert.equal(result.stone, "Ngọc trai");
  assert.deepEqual(result.images, ["/ring.jpg"]);
});
