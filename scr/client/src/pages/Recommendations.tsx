import Image from "../components/Image";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request, token } from "../lib/api";
export default function Recommendations() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token()) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request("/recommendations", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Chưa tải được gợi ý cá nhân. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
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
      {!token() && (
        <section className="lux-empty">
          <h2>Khám phá lựa chọn dành riêng cho bạn</h2>
          <p>
            Đăng nhập để nhận gợi ý từ sở thích và những thiết kế bạn quan tâm.
          </p>
          <Link className="gold-btn" to="/login?next=%2Ffor-you">
            Đăng nhập
          </Link>
        </section>
      )}
      {loading && <p role="status">Đang tìm thiết kế phù hợp...</p>}
      {error && token() && (
        <div className="catalog-notice" role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && token() && data?.products?.length === 0 && (
        <p>
          Chưa có thiết kế phù hợp.{" "}
          <Link to="/products">Khám phá bộ sưu tập</Link>
        </p>
      )}
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
            <Image src={p.images?.[0] || "/placeholder.svg"} alt={p.name} />
            <b>{p.name}</b>
            <span>
              {Number(p.salePrice ?? p.price).toLocaleString("vi-VN")}₫
            </span>
            <strong>Phù hợp {p.score}%</strong>
          </Link>
        ))}
      </div>
    </main>
  );
}
