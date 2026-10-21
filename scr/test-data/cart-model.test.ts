import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateCartTotals,
  canIncreaseQuantity,
  changeQuantity,
} from "../client/src/models/cart.model";
import type { CartItem } from "../client/src/store/cart";
import config from "../server/src/data/storeConfig.json";

const item: CartItem = {
  _id: "ring",
  name: "Ring",
  price: 100_000,
  image: "ring.svg",
  size: "12",
  quantity: 2,
  stock: 5,
};

test("stock is shared by all variants of a product", () => {
  const cart = [item, { ...item, size: "14", quantity: 3 }];
  assert.equal(canIncreaseQuantity(cart, 0), false);
  assert.equal(changeQuantity(cart, 0, 3), cart);
  const next = changeQuantity(cart, 1, 2);
  assert.equal(canIncreaseQuantity(next, 0), true);
  assert.equal(cart[1].quantity, 3);
  assert.equal(next[1].quantity, 2);
});

test("quantity changes preserve other products and reject invalid input", () => {
  const cart = [item, { ...item, _id: "necklace" }];
  assert.deepEqual(changeQuantity(cart, 0, 0), [cart[1]]);
  for (const quantity of [NaN, Infinity, 1.5, 101])
    assert.equal(changeQuantity(cart, 0, quantity), cart);
  assert.equal(changeQuantity(cart, 8, 1), cart);
  assert.equal(canIncreaseQuantity(cart, 8), false);
  assert.equal(
    canIncreaseQuantity([{ ...item, stock: 200, quantity: 100 }], 0),
    false,
  );
});

test("totals follow configured shipping threshold and empty cart is free", () => {
  assert.deepEqual(calculateCartTotals([]), {
    subtotal: 0,
    shipping: 0,
    total: 0,
  });
  const low = calculateCartTotals([{ ...item, price: 1, quantity: 1 }]);
  assert.equal(low.shipping, config.shippingFee);
  assert.equal(low.total, 1 + config.shippingFee);
  const threshold = calculateCartTotals([
    { ...item, price: config.freeShippingFrom, quantity: 1 },
  ]);
  assert.equal(threshold.shipping, 0);
  assert.equal(threshold.total, config.freeShippingFrom);
});
