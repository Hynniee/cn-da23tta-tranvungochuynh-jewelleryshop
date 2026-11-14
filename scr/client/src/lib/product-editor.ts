import { isGenericSize, productSizes } from "./product-sizes";
export type EditableProduct = {
  name: string;
  slug: string;
  category: string;
  material: string;
  price: number;
  stock: number;
  sizeStocks?: { size: string; stock: number }[];
  images?: string[];
  stone?: string;
  sizes?: string[];
  description?: string;
  engravingAllowed?: boolean;
};
export type ProductForm = {
  name: string;
  slug: string;
  category: string;
  material: string;
  price: string;
  stock: string;
  sizeStocks?: Record<string, string>;
  image: string;
  stone: string;
  sizes: string;
  description: string;
  engravingAllowed: boolean;
};
export function productForm(product: EditableProduct): ProductForm {
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    material: product.material,
    price: String(product.price),
    stock: String(product.stock),
    sizeStocks: Object.fromEntries(
      (
        product.sizeStocks ||
        productSizes(product).map((size, index, sizes) => ({
          size,
          stock:
            Math.floor(product.stock / sizes.length) +
            (index < product.stock % sizes.length ? 1 : 0),
        }))
      ).map((row) => [row.size, String(row.stock)]),
    ),
    image: product.images?.[0] || "",
    stone: product.stone || "Không đính đá",
    sizes: productSizes(product).join(", "),
    description: product.description || "",
    engravingAllowed: Boolean(product.engravingAllowed),
  };
}
function serialize(form: ProductForm) {
  const sizes = [
    ...new Set(
      form.sizes
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const sizeStocks =
    form.sizeStocks &&
    sizes.map((size) => ({
      size,
      stock: Number(form.sizeStocks?.[size] ?? 0),
    }));
  if (
    sizeStocks?.some((row) => !Number.isSafeInteger(row.stock) || row.stock < 0)
  )
    throw new Error("Tồn kho mỗi size phải là số nguyên không âm");
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    category: form.category,
    material: form.material.trim(),
    price: Number(form.price),
    stock: sizeStocks?.length
      ? sizeStocks.reduce((sum, row) => sum + row.stock, 0)
      : Number(form.stock),
    ...(sizeStocks ? { sizeStocks } : {}),
    images: form.image.trim() ? [form.image.trim()] : [],
    stone: form.stone,
    sizes: form.sizes
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    description: form.description.trim(),
    engravingAllowed: form.engravingAllowed,
  };
}
export function productChanges(form: ProductForm, original?: ProductForm) {
  if (form.sizes.split(",").some((value) => isGenericSize(value.trim())))
    throw new Error(
      "Nhập kích cỡ cụ thể, ví dụ 12, 14 hoặc 40 cm, 45 cm; không dùng size tiêu chuẩn",
    );
  const values = serialize(form);
  if (
    !form.stock.trim() ||
    !Number.isSafeInteger(values.stock) ||
    values.stock < 0
  )
    throw new Error("Tồn kho phải là số nguyên không âm");
  if (!form.price.trim() || !Number.isFinite(values.price) || values.price < 0)
    throw new Error("Giá bán phải là số không âm");
  if (!original) return values;
  const previous = serialize(original);
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(previous[key as keyof typeof previous]),
    ),
  );
}
