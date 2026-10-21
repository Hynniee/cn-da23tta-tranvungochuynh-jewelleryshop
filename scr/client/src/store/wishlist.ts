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
}
