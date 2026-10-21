import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../lib/api";
import { demoProducts } from "../data/demoProducts";
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
  useEffect(() => {
    request("/products")
      .then(setProducts)
      .catch(() => setProducts(demoProducts));
    const update = () => setIds(getWishlist());
    window.addEventListener("wishlistchange", update);
    return () => window.removeEventListener("wishlistchange", update);
  }, []);
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
      {!shown.length && <p>Chưa có sản phẩm yêu thích.</p>}
      <Link className="btn" to="/shop">
        Khám phá sản phẩm
      </Link>
    </section>
  );
}
