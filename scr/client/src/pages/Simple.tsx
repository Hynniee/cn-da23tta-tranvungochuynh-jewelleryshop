import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../lib/api";
import { getWishlist } from "../store/wishlist";
import ProductCard from "../components/ProductCard";
export function About() {
  return (
    <section className="simple">
      <p className="eyebrow">OUR STORY</p>
      <h1>MIRA — đẹp theo cách của riêng bạn.</h1>
      <p>
        MIRA Jewelry theo đuổi tinh thần tối giản: đường nét nhẹ nhàng, chất
        liệu dễ sử dụng và những thiết kế có thể đồng hành lâu dài.
      </p>
      <p>
        Chúng tôi không tạo ra trang sức để lấn át người đeo. MIRA muốn mỗi món
        đồ là một điểm nhấn vừa đủ, để cá tính của bạn luôn là điều được nhìn
        thấy đầu tiên.
      </p>
    </section>
  );
}
export function Wishlist() {
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
    window.addEventListener("wishlistchange", update);
    return () => {
      controller.abort();
      window.removeEventListener("wishlistchange", update);
    };
  }, [attempt]);
  const shown = products.filter((p) => ids.includes(p._id));
  return (
    <section className="simple">
      <p className="eyebrow">WISHLIST</p>
      <h1>Sản phẩm yêu thích</h1>
      <p>Các sản phẩm bạn bấm ♡ được lưu trên trình duyệt này.</p>
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
    </section>
  );
}
