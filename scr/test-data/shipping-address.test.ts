import assert from "node:assert/strict";
import { test } from "node:test";
import {
  provinces,
  shippingAddress,
} from "../server/src/services/shipping-address.service.js";
test("post-merger dataset has two levels and unique official codes", () => {
  assert.equal(provinces.length, 34);
  assert.equal(new Set(provinces.map((p) => p.code)).size, 34);
  const wards = provinces.flatMap((p) => p.wards);
  assert.equal(wards.length, 3321);
  assert.equal(new Set(wards.map((w) => w.code)).size, 3321);
});
test("shipping address uses trusted names and rejects wards from another province", () => {
  const value = {
    provinceCode: "79",
    wardCode: "25747",
    addressLine: " 12 Nguyễn Huệ ",
  };
  const result = shippingAddress(value);
  assert.equal(
    result.address,
    "12 Nguyễn Huệ, Phường Thủ Dầu Một, Thành phố Hồ Chí Minh",
  );
  assert.equal(result.addressLine, "12 Nguyễn Huệ");
  for (const input of [
    { ...value, provinceCode: "01" },
    { ...value, wardCode: "fake" },
    { ...value, addressLine: " " },
    { ...value, addressLine: "a".repeat(251) },
    {},
  ])
    assert.throws(() => shippingAddress(input), { status: 400 });
});
