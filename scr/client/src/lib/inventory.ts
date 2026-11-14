export type SizeStock = { size: string; stock: number };
export function compareProductStock(
  a: { stock: number; name: string },
  b: { stock: number; name: string },
) {
  return a.stock - b.stock || a.name.localeCompare(b.name, "vi");
}
export function selectedStock(
  product: { stock: number; sizeStocks?: SizeStock[] },
  size: string,
) {
  return product.sizeStocks?.length
    ? (product.sizeStocks.find((row) => row.size === size)?.stock ?? 0)
    : product.stock;
}
export function sameStock(
  a: { _id: string; size?: string; sizeStocks?: SizeStock[] },
  b: { _id: string; size?: string },
) {
  return a._id === b._id && (!a.sizeStocks?.length || a.size === b.size);
}
