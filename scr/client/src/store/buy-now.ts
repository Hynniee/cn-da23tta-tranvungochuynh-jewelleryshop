import type { CartItem } from "./cart";

const KEY = "mira_buy_now";
export const BUY_NOW_CHECKOUT = "/checkout?buyNow=1";

export function getBuyNow(): CartItem[] {
  try {
    const item = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      !item ||
      typeof item._id !== "string" ||
      typeof item.name !== "string" ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100
    )
      return [];
    return [item];
  } catch {
    return [];
  }
}

export function saveBuyNow(item: CartItem) {
  sessionStorage.setItem(KEY, JSON.stringify(item));
}

export function clearBuyNow() {
  sessionStorage.removeItem(KEY);
}
