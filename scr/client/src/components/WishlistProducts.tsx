import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../lib/api";
import { getWishlist } from "../store/wishlist";
import ProductCard from "./ProductCard";
export default function WishlistProducts() {
  const [ids, setIds] = useState(getWishlist);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request("/products", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setProducts(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Chưa tải được sản phẩm yêu thích. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const update = () => setIds(getWishlist());
    const syncStorage = (event: StorageEvent) => {
      if (event.key === "mira_wishlist" || event.key === null) update();
    };
    window.addEventListener("wishlistchange", update);
    window.addEventListener("storage", syncStorage);
    return () => {
      controller.abort();
      window.removeEventListener("wishlistchange", update);
      window.removeEventListener("storage", syncStorage);
    };
  }, [attempt]);
  const shown = products.filter((p) => ids.includes(p._id));
  return (
    <div className="wishlist-products">
      <div className="shop-grid">
        {shown.map((p) => (
          <ProductCard key={p._id} p={p} />
        ))}
      </div>
      {loading && <p role="status">Đang tải sản phẩm yêu thích...</p>}
      {error && (
        <div className="catalog-notice" role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && !shown.length && (
        <p>Chưa có sản phẩm yêu thích.</p>
      )}
      <Link className="btn" to="/shop">
        Khám phá sản phẩm
      </Link>
    </div>
  );
}
