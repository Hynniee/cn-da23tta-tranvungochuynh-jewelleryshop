import Image from "../components/Image";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../lib/api";
export default function Recommendations() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    request("/recommendations")
      .then(setData)
      .catch(() =>
        setData({
          error: "Đăng nhập và tương tác với sản phẩm để tạo gợi ý cá nhân.",
        }),
      );
  }, []);
  return (
    <main className="smart-page">
      <header>
        <span>PERSONALIZED FOR YOU</span>
        <h1>Dành riêng cho bạn</h1>
        <p>
          Được xếp hạng từ hành vi xem, tìm kiếm, yêu thích, giỏ hàng và mua
          hàng.
        </p>
      </header>
      {data?.error && <p>{data.error}</p>}
      <div className="smart-products">
        {data?.products?.map((p: any) => (
          <Link
            key={p._id}
            to={`/product/${p.slug}`}
            onClick={() =>
              data.recommendationId &&
              request(`/recommendations/${data.recommendationId}/feedback`, {
                method: "POST",
                body: JSON.stringify({ clickedProduct: p._id }),
              }).catch(() => {})
            }
          >
            <Image src={p.images?.[0] || "/placeholder.svg"} />
            <b>{p.name}</b>
            <span>{Number(p.price).toLocaleString("vi-VN")}₫</span>
            <strong>Phù hợp {p.score}%</strong>
          </Link>
        ))}
      </div>
    </main>
  );
}
