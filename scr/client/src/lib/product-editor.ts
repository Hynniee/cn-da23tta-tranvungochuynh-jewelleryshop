export type EditableProduct = {
  name: string;
  slug: string;
  category: string;
  material: string;
  price: number;
  stock: number;
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
    image: product.images?.[0] || "",
    stone: product.stone || "Không đính đá",
    sizes: product.sizes?.join(", ") || "Tiêu chuẩn",
    description: product.description || "",
    engravingAllowed: Boolean(product.engravingAllowed),
  };
}
function serialize(form: ProductForm) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    category: form.category,
    material: form.material.trim(),
    price: Number(form.price),
    stock: Number(form.stock),
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
  const values = serialize(form);
  if (
    !form.stock.trim() ||
    !Number.isSafeInteger(values.stock) ||
    values.stock < 0
  )
    throw new Error("Tồn kho phải là số nguyên không âm.");
  if (!form.price.trim() || !Number.isFinite(values.price) || values.price < 0)
    throw new Error("Giá bán phải là số không âm.");
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
