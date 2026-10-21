import { shippingFee } from "../lib/commerce";
import type { CartItem } from "../store/cart";

// A product's stock is shared across sizes and engraving variants.
export function canIncreaseQuantity(cart: CartItem[], index: number): boolean {
  const item = cart[index];
  if (!item) return false;
  const quantity = cart
    .filter((entry) => entry._id === item._id)
    .reduce((sum, entry) => sum + entry.quantity, 0);
  return item.quantity < 100 && quantity < (item.stock ?? 100);
}

export function changeQuantity(
  cart: CartItem[],
  index: number,
  quantity: number,
): CartItem[] {
  const item = cart[index];
  if (!item || !Number.isInteger(quantity)) return cart;
  if (quantity < 1) return cart.filter((_, i) => i !== index);
  const others = cart
    .filter((entry, i) => i !== index && entry._id === item._id)
    .reduce((sum, entry) => sum + entry.quantity, 0);
  if (quantity > Math.min(100, (item.stock ?? 100) - others)) return cart;
  return cart.map((entry, i) => (i === index ? { ...entry, quantity } : entry));
}

export function calculateCartTotals(cart: CartItem[]) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = shippingFee(subtotal);
  return { subtotal, shipping, total: subtotal + shipping };
}
