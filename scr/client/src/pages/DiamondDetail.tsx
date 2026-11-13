import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { request } from "../lib/api";
import Image from "../components/Image";
export default function DiamondDetail() {
  const { id } = useParams();
  const [diamond, setDiamond] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setDiamond(null);
    setError("");
    request(`/diamonds/${encodeURIComponent(id || "")}`, {
      signal: controller.signal,
    })
      .then(setDiamond)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id]);
  return (
    <main className="smart-page">
      <header>
        <span>MIRA DIAMOND</span>
        <h1>{diamond ? `Kim cương ${diamond.code}` : "Thông tin kim cương"}</h1>
      </header>
      {error && <p role="alert">{error}</p>}
      {!diamond && !error && <p role="status">Đang tải thông tin…</p>}
      {diamond && (
        <section className="diamond-detail">
          <Image src={diamond.image || "/placeholder.svg"} alt={diamond.code} />
          <div>
            <h2>{Number(diamond.price).toLocaleString("vi-VN")}₫</h2>
            <dl>
              {[
                ["Trọng lượng", `${diamond.carat} ct`],
                ["Giác cắt", diamond.cut],
                ["Màu", diamond.color],
                ["Độ tinh khiết", diamond.clarity],
                ["Hình dạng", diamond.shape],
                ["Mã báo cáo GIA", diamond.giaReport || "Chưa cung cấp"],
                ["Tình trạng", diamond.stock > 0 ? "Còn hàng" : "Hết hàng"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <Link to="/appointments" className="gold-btn">
              Đặt lịch tư vấn kim cương
            </Link>
          </div>
        </section>
      )}
      <div className="decision-actions">
        <Link to="/diamond-dss">Chọn và so sánh theo 4Cs</Link>
        <Link to="/advisor">Tiếp tục hội thoại tư vấn</Link>
      </div>
    </main>
  );
}
