import Image from "./Image";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { getWishlist, toggleWishlist } from "../store/wishlist";
export default function ProductCard({ p }: { p: any }) {
  const [ids, setIds] = useState(getWishlist);
  useEffect(() => {
    const update = () => setIds(getWishlist());
    window.addEventListener("wishlistchange", update);
    return () => window.removeEventListener("wishlistchange", update);
  }, []);
  return (
    <article className="product-card">
      <div className="photo">
        <Link to={`/product/${p.slug}`}>
          <Image src={p.images?.[0] || "/placeholder.svg"} alt={p.name} />
        </Link>
        <button
          className="heart"
          aria-label={`Yêu thích ${p.name}`}
          aria-pressed={ids.includes(p._id)}
          onClick={() => toggleWishlist(p._id)}
        >
          <Heart
            size={18}
            fill={ids.includes(p._id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <small>
        {p.category} · {p.material} {p.stone && `· ${p.stone}`}
      </small>
      <Link to={`/product/${p.slug}`}>
        <h3>{p.name}</h3>
      </Link>
      <strong>{Number(p.salePrice ?? p.price).toLocaleString("vi-VN")}₫</strong>
    </article>
  );
}
