import { trackBehavior } from "../lib/behavior";
import { productSizes } from "../lib/product-sizes";
export type CartItem = {
  _id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  sizeOptions?: string[];
  quantity: number;
  material?: string;
  carat?: string;
  slug?: string;
  stone?: string;
  stock?: number;
  engraving?: string;
};

const KEY = "mira_cart";

export function getCart(): CartItem[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(items)) return [];
    return items.filter(
      (item): item is CartItem =>
        item &&
        typeof item._id === "string" &&
        typeof item.name === "string" &&
        Number.isFinite(item.price) &&
        item.price >= 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cartchange"));
}

export function addCart(item: CartItem) {
  const cart = getCart();
  const index = cart.findIndex(
    (x) =>
      x._id === item._id &&
      x.size === item.size &&
      x.material === item.material &&
      x.carat === item.carat &&
      x.engraving === item.engraving,
  );
  const productQuantity = cart
    .filter((x) => x._id === item._id)
    .reduce((sum, x) => sum + x.quantity, 0);
  if (item.stock !== undefined && productQuantity + item.quantity > item.stock)
    return false;
  if (index >= 0) cart[index].quantity += item.quantity;
  else cart.push(item);
  saveCart(cart);
  trackBehavior("ADD_CART", { product: item._id });
  return true;
}

export function reconcileItems(
  selectedItems: CartItem[],
  products: {
    _id: string;
    slug?: string;
    name: string;
    price: number;
    salePrice?: number;
    stock: number;
    material: string;
    stone?: string;
    images?: string[];
    sizes?: string[];
    category?: string;
  }[],
): CartItem[] {
  return selectedItems.map((item) => {
    const product = products.find(
      (p) =>
        p._id === item._id ||
        (item.slug ? p.slug === item.slug : p.name === item.name),
    );
    if (!product) return { ...item, stock: 0 };
    const sizeOptions = productSizes(product);
    return {
      ...item,
      _id: product._id,
      slug: product.slug,
      name: product.name,
      sizeOptions,
      size: sizeOptions.length
        ? sizeOptions.includes(item.size)
          ? item.size
          : ""
        : "",
      price: product.salePrice ?? product.price,
      stock: product.stock,
      material: product.material,
      stone: product.stone,
      image: product.images?.[0] || item.image,
    };
  });
}
export function reconcileCart(
  products: Parameters<typeof reconcileItems>[1],
): CartItem[] {
  const items = reconcileItems(getCart(), products);
  saveCart(items);
  return items;
}
export function cartHasStock(items: CartItem[]): boolean {
  const totals = new Map<string, number>();
  for (const item of items)
    totals.set(item._id, (totals.get(item._id) || 0) + item.quantity);
  return items.every(
    (item) =>
      item.stock === undefined || item.stock >= (totals.get(item._id) || 0),
  );
}
export function cartHasValidSizes(items: CartItem[]): boolean {
  return items.every(
    (item) => !item.sizeOptions?.length || item.sizeOptions.includes(item.size),
  );
}
