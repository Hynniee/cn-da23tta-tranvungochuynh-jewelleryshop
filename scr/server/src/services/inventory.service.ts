import Product from "../models/Product.js";
import { productSizes } from "./product-sizes.js";

export type SizeStock = { size: string; stock: number };
export function sizeInventory(product: any): SizeStock[] {
  if (Array.isArray(product.sizeStocks)) return product.sizeStocks;
  const sizes = productSizes(product);
  const total = Math.max(0, product.stock || 0);
  return sizes.map((size, index) => ({
    size,
    stock:
      Math.floor(total / sizes.length) + (index < total % sizes.length ? 1 : 0),
  }));
}

export function inventoryInput(body: any, before?: any) {
  const data = { ...body };
  // Product writes accept fields, never MongoDB update operators.
  if (Object.keys(data).some((key) => key.startsWith("$") || key.includes(".")))
    throw Object.assign(new Error("Dữ liệu sản phẩm không hợp lệ"), {
      status: 400,
    });
  if (
    data.stock !== undefined &&
    (!Number.isSafeInteger(data.stock) || data.stock < 0)
  )
    throw Object.assign(new Error("Tồn kho phải là số nguyên không âm"), {
      status: 400,
    });
  if (
    before &&
    !["stock", "sizes", "sizeStocks", "category"].some((key) => key in data)
  )
    return data;
  const merged = { ...before, ...data };
  const sizes = productSizes(merged);
  if (
    before &&
    productSizes(before).length &&
    data.stock !== undefined &&
    data.stock !== before.stock &&
    data.sizeStocks === undefined
  )
    throw Object.assign(
      new Error("Vui lòng cập nhật tồn kho theo từng kích cỡ"),
      { status: 400 },
    );
  const rows = data.sizeStocks ?? (before ? sizeInventory(before) : undefined);
  if (rows !== undefined) {
    if (
      !Array.isArray(rows) ||
      rows.some(
        (row: any) =>
          !row ||
          typeof row.size !== "string" ||
          !sizes.includes(row.size) ||
          !Number.isSafeInteger(row.stock) ||
          row.stock < 0,
      ) ||
      new Set(rows.map((row: any) => row.size)).size !== rows.length ||
      rows.length !== sizes.length
    )
      throw Object.assign(
        new Error("Nhập tồn kho nguyên không âm cho từng kích cỡ đang bán"),
        { status: 400 },
      );
    data.sizeStocks = rows.map(({ size, stock }: SizeStock) => ({
      size,
      stock,
    }));
    if (sizes.length)
      data.stock = rows.reduce(
        (sum: number, row: SizeStock) => sum + row.stock,
        0,
      );
  } else if (sizes.length) {
    data.sizeStocks = sizeInventory(merged);
  } else data.sizeStocks = [];
  if (data.stock !== undefined && !Number.isSafeInteger(data.stock))
    throw Object.assign(new Error("Tổng tồn kho vượt giới hạn cho phép"), {
      status: 400,
    });
  return data;
}

export async function reserveInventory(
  id: string,
  size: string,
  quantity: number,
) {
  const product = await Product.findById(id).lean();
  if (!product) return false;
  if (!Array.isArray(product.sizeStocks)) {
    await Product.updateOne(
      { _id: id, sizeStocks: { $exists: false }, stock: product.stock },
      { $set: { sizeStocks: sizeInventory(product) } },
    );
  }
  const sized = productSizes(product).length > 0;
  const result = await Product.updateOne(
    {
      _id: id,
      stock: { $gte: quantity },
      ...(sized
        ? { sizeStocks: { $elemMatch: { size, stock: { $gte: quantity } } } }
        : {}),
    },
    {
      $inc: {
        stock: -quantity,
        ...(sized ? { "sizeStocks.$.stock": -quantity } : {}),
      },
    },
  );
  return result.modifiedCount === 1;
}

export async function restoreInventory(
  id: string,
  size: string,
  quantity: number,
) {
  const result = await Product.updateOne(
    { _id: id, "sizeStocks.size": size },
    { $inc: { stock: quantity, "sizeStocks.$.stock": quantity } },
  );
  if (!result.matchedCount) {
    // A size can have been removed since the order. Preserve its returned units.
    const product = await Product.findById(id).lean();
    if (!product) return;
    if (size && Array.isArray(product.sizeStocks)) {
      const appended = await Product.updateOne(
        { _id: id, "sizeStocks.size": { $ne: size } },
        {
          $inc: { stock: quantity },
          $push: { sizeStocks: { size, stock: quantity } },
          $addToSet: { sizes: size },
        },
      );
      if (!appended.matchedCount) await restoreInventory(id, size, quantity);
    } else await Product.updateOne({ _id: id }, { $inc: { stock: quantity } });
  }
}
