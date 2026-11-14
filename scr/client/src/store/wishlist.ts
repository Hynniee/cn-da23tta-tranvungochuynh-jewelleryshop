import { notify } from "../lib/notifications";
import { trackBehavior } from "../lib/behavior";

const KEY = "mira_wishlist";
export function getWishlist(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
export function toggleWishlist(id: string) {
  const ids = getWishlist();
  localStorage.setItem(
    KEY,
    JSON.stringify(
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    ),
  );
  window.dispatchEvent(new Event("wishlistchange"));
  if (!ids.includes(id)) trackBehavior("WISHLIST", { product: id });
  notify(
    ids.includes(id)
      ? "Đã xóa sản phẩm khỏi danh sách yêu thích"
      : "Đã thêm sản phẩm vào danh sách yêu thích",
  );
}
