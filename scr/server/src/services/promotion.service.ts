import { sizeInventory } from "./inventory.service.js";
import mongoose from "mongoose";
import Promotion from "../models/Promotion.js";
import Product from "../models/Product.js";
import { catalogProduct } from "./product-data.service.js";
import { isGenericSize } from "./product-sizes.js";
import storeConfig from "../data/storeConfig.json" with { type: "json" };

export class PromotionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const fail = (message: string): never => {
  throw new PromotionError(message);
};
export function promotionInput(input: any) {
  const { type, discountType } = input;
  if (!["voucher", "discount", "flash_sale"].includes(type))
    fail("Loại khuyến mãi không hợp lệ");
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 120
  )
    fail("Tên chương trình phải từ 1 đến 120 ký tự");
  if (!["percent", "amount"].includes(discountType))
    fail("Chọn giảm theo phần trăm hoặc số tiền");
  const value = input.value;
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 1e12 ||
    (discountType === "percent" && value > 100)
  )
    fail("Mức giảm phải là số nguyên dương; phần trăm không vượt quá 100%");
  const minSubtotal = input.minSubtotal ?? 0,
    maxDiscount = input.maxDiscount ?? 0;
  if (
    ![minSubtotal, maxDiscount].every(
      (v) => Number.isSafeInteger(v) && v >= 0 && v <= 1e12,
    )
  )
    fail("Điều kiện đơn hàng và giảm tối đa phải là số tiền không âm");
  if (typeof input.startsAt !== "string" || typeof input.endsAt !== "string")
    fail("Thời gian bắt đầu và kết thúc không hợp lệ");
  const startsAt = new Date(input.startsAt),
    endsAt = new Date(input.endsAt);
  if (
    !Number.isFinite(startsAt.getTime()) ||
    !Number.isFinite(endsAt.getTime()) ||
    endsAt <= startsAt
  )
    fail("Thời gian kết thúc phải sau thời gian bắt đầu");
  if (
    typeof input.active !== "boolean" ||
    typeof input.allProducts !== "boolean"
  )
    fail("Trạng thái chương trình không hợp lệ");
  const productIds = input.productIds ?? [];
  if (
    !Array.isArray(productIds) ||
    productIds.length > 500 ||
    !productIds.every(
      (id) => typeof id === "string" && mongoose.isValidObjectId(id),
    )
  )
    fail("Danh sách sản phẩm không hợp lệ (tối đa 500)");
  if (type !== "voucher" && !input.allProducts && !productIds.length)
    fail("Chọn sản phẩm áp dụng hoặc chọn tất cả sản phẩm");
  const code =
    typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  if (type === "voucher" && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code))
    fail(
      "Mã voucher gồm 3–32 chữ cái không dấu, chữ số, dấu gạch ngang hoặc gạch dưới",
    );
  return {
    name: input.name.trim(),
    type,
    discountType,
    value,
    minSubtotal: type === "voucher" ? minSubtotal : 0,
    maxDiscount,
    startsAt,
    endsAt,
    active: input.active,
    allProducts: type === "voucher" || input.allProducts,
    productIds:
      type === "voucher" || input.allProducts
        ? []
        : [...new Set<string>(productIds)],
    ...(type === "voucher" ? { code } : {}),
  };
}
export function discountAmount(amount: number, promotion: any) {
  const reduction =
    promotion.discountType === "percent"
      ? Math.floor((amount * promotion.value) / 100)
      : promotion.value;
  return Math.max(
    0,
    Math.min(
      amount,
      promotion.maxDiscount > 0
        ? Math.min(reduction, promotion.maxDiscount)
        : reduction,
    ),
  );
}
export async function activeProductPromotions(
  now = new Date(),
  readPreference: "primary" | "primaryPreferred" = "primaryPreferred",
) {
  return Promotion.find({
    active: true,
    type: { $in: ["discount", "flash_sale"] },
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  })
    .read(readPreference)
    .lean();
}
export function promotedProduct(raw: any, promotions: any[], now = new Date()) {
  const product = catalogProduct(raw);
  let bestPrice = Number(product.salePrice ?? product.price);
  let winner: any;
  for (const promotion of promotions) {
    if (
      !promotion.active ||
      new Date(promotion.startsAt) > now ||
      new Date(promotion.endsAt) <= now
    )
      continue;
    if (
      !promotion.allProducts &&
      !promotion.productIds.some(
        (id: any) => String(id) === String(product._id),
      )
    )
      continue;
    const candidate = product.price - discountAmount(product.price, promotion);
    if (
      candidate < bestPrice ||
      (candidate === bestPrice &&
        winner &&
        promotion.type === "flash_sale" &&
        winner.type !== "flash_sale")
    ) {
      bestPrice = candidate;
      winner = promotion;
    }
  }
  return winner
    ? {
        ...product,
        salePrice: bestPrice,
        promotion: {
          id: String(winner._id),
          name: winner.name,
          type: winner.type,
          endsAt: new Date(winner.endsAt).toISOString(),
        },
      }
    : product;
}
export async function quoteOrder(
  items: any,
  voucherCode?: unknown,
  now = new Date(),
  readPreference: "primary" | "primaryPreferred" = "primaryPreferred",
) {
  if (!Array.isArray(items) || !items.length || items.length > 100)
    fail("Giỏ hàng không hợp lệ");
  if (
    voucherCode != null &&
    (typeof voucherCode !== "string" || voucherCode.length > 32)
  )
    fail("Mã voucher không hợp lệ");
  const promotions = await activeProductPromotions(now, readPreference);
  const quantities = new Map<string, number>();
  const sizeQuantities = new Map<string, number>();
  const normalized: any[] = [];
  for (const item of items) {
    if (
      !item ||
      typeof item.product !== "string" ||
      !mongoose.isValidObjectId(item.product) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100
    )
      fail("Sản phẩm hoặc số lượng không hợp lệ");
    const raw = await Product.findById(item.product)
      .read(readPreference)
      .lean();
    const quantity = (quantities.get(item.product) || 0) + item.quantity;
    if (!raw || !Number.isFinite(raw.stock) || raw.stock < quantity)
      throw new PromotionError("Sản phẩm không đủ tồn kho", 409);
    const product = promotedProduct(raw, promotions, now);
    if (
      !Number.isSafeInteger(product.salePrice ?? product.price) ||
      (product.salePrice ?? product.price) < 0
    )
      fail("Giá sản phẩm không hợp lệ. Vui lòng liên hệ cửa hàng");
    quantities.set(item.product, quantity);
    if (product.sizes?.length && !product.sizes.includes(item.size))
      fail(`Vui lòng chọn kích cỡ hợp lệ cho ${product.name}`);
    if (
      !product.sizes?.length &&
      item.size != null &&
      item.size !== "" &&
      !isGenericSize(item.size)
    )
      fail(`Sản phẩm ${product.name} không có lựa chọn kích cỡ này`);
    const sizeKey = JSON.stringify([item.product, item.size || ""]);
    const sizeQuantity = (sizeQuantities.get(sizeKey) || 0) + item.quantity;
    sizeQuantities.set(sizeKey, sizeQuantity);
    if (
      product.sizes?.length &&
      (sizeInventory(raw).find((row) => row.size === item.size)?.stock ?? 0) <
        sizeQuantity
    )
      throw new PromotionError(
        `Kích cỡ ${item.size} của ${product.name} không đủ tồn kho`,
        409,
      );
    normalized.push({
      product: product._id,
      name: product.name,
      price: product.salePrice ?? product.price,
      quantity: item.quantity,
      size: product.sizes?.length ? item.size : "",
      image: product.images?.[0],
      material: product.material,
      originalPrice: product.price,
      promotion: product.promotion,
      engraving:
        product.engravingAllowed && typeof item.engraving === "string"
          ? item.engraving.trim().slice(0, 16)
          : "",
    });
  }
  const subtotal = normalized.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  if (!Number.isSafeInteger(subtotal))
    fail("Tổng giá trị giỏ hàng vượt giới hạn cho phép");
  const code =
    typeof voucherCode === "string" ? voucherCode.trim().toUpperCase() : "";
  let voucher: any = null;
  if (code) {
    const promotion = await Promotion.findOne({
      type: "voucher",
      code,
      active: true,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
    })
      .read(readPreference)
      .lean();
    if (!promotion)
      fail("Voucher không tồn tại, đã tắt hoặc ngoài thời gian áp dụng");
    if (subtotal < promotion!.minSubtotal)
      fail(
        `Voucher yêu cầu đơn từ ${promotion!.minSubtotal.toLocaleString("vi-VN")}₫`,
      );
    voucher = {
      id: String(promotion!._id),
      code,
      name: promotion!.name,
      discount: discountAmount(subtotal, promotion),
    };
  }
  const shippingFee =
    subtotal >= storeConfig.freeShippingFrom ? 0 : storeConfig.shippingFee;
  const discountTotal = voucher?.discount || 0;
  return {
    items: normalized,
    subtotal,
    shippingFee,
    discountTotal,
    voucher,
    total: subtotal - discountTotal + shippingFee,
  };
}
