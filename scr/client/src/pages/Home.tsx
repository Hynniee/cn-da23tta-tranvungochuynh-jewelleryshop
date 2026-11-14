import Image from "../components/Image";
import {
  ArrowRight,
  Award,
  BookOpen,
  Diamond,
  Gem,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { request } from "../lib/api";
import ProductCard from "../components/ProductCard";
const cats = [
  ["Nhẫn", "Biểu tượng của lời hứa vĩnh cửu", "/editorial/rings.jpg"],
  ["Dây chuyền", "Ánh sáng chạm gần trái tim", "/editorial/necklaces.jpg"],
  ["Bông tai", "Điểm sáng của khí chất", "/editorial/earrings.jpg"],
  ["Lắc & vòng tay", "Nhịp điệu của sự thanh lịch", "/editorial/bracelets.jpg"],
];
export default function Home() {
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
          setError("Chưa thể tải bộ sưu tập. Vui lòng thử lại sau ít phút.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const featured = products.filter((p) => p.featured);
  const curatedSlugs = [
    "nhan-bac-flora",
    "day-chuyen-ngoc-trai-clair",
    "bong-tai-emerald-verde",
    "solitaire-etoile-diamond-ring",
  ];
  const curated = curatedSlugs
    .map((slug) => products.find((p) => p.slug === slug))
    .filter(Boolean);
  const best = (
    curated.length ? curated : featured.length ? featured : products
  ).slice(0, 4);
  return (
    <div className="figma-home">
      <section className="hero-lux">
        <Image
          src="/editorial/hero.jpg"
          alt="Trang sức MIRA với điểm nhấn vàng và đá quý"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span>MAISON MIRA · FINE JEWELRY</span>
          <h1>
            Kiệt tác kim hoàn
            <br />
            <i>Nơi ánh sáng hội tụ</i>
          </h1>
          <p>
            Trang sức vàng, bạc, ngọc trai và đá màu — những thiết kế giúp bạn
            thể hiện phong cách riêng mỗi ngày.
          </p>
          <div>
            <Link to="/products" className="gold-btn">
              Khám phá bộ sưu tập <ArrowRight size={15} />
            </Link>
            <a href="#atelier" className="ghost-btn">
              Về MIRA
            </a>
          </div>
        </div>
        <div className="hero-values">
          <span>
            <Diamond />
            <b>VÀNG · BẠC · ĐÁ QUÝ</b>
            <small>Chất liệu rõ ràng</small>
          </span>
          <span>
            <ShieldCheck />
            <b>BẢO CHỨNG TRỌN ĐỜI</b>
            <small>Thu đổi minh bạch</small>
          </span>
          <span>
            <Sparkles />
            <b>CHẾ TÁC THỦ CÔNG</b>
            <small>Hoàn thiện bởi nghệ nhân</small>
          </span>
        </div>
      </section>
      <section className="home-section">
        <div className="center-title">
          <span>DANH MỤC SẢN PHẨM</span>
          <h2>Danh mục trang sức</h2>
          <p>
            Những thiết kế vượt thời gian dành cho những khoảnh khắc đáng nhớ
            nhất.
          </p>
        </div>
        <div className="category-grid">
          {cats.map((c, i) => (
            <Link
              to={`/shop?category=${encodeURIComponent(["Nhẫn", "Dây chuyền", "Bông tai", "Vòng tay"][i])}`}
              className="cat-card"
              key={c[0]}
            >
              <Image src={c[2]} alt={c[0]} loading="lazy" />
              <div>
                <small>0{i + 1}</small>
                <h3>{c[0]}</h3>
                <p>{c[1]}</p>
                <b>
                  KHÁM PHÁ <ArrowRight size={14} />
                </b>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="jewelry-collections home-section">
        <div className="center-title">
          <span>CHỌN THEO CHẤT LIỆU</span>
          <h2>Trang sức cho mọi phong cách</h2>
          <p>Từ thiết kế bạc dễ đeo đến vàng, ngọc trai và sắc màu đá quý.</p>
        </div>
        <div className="collection-links">
          {[
            ["bac", "Trang sức bạc", "Từ 390.000₫"],
            ["vang", "Trang sức vàng", "Vàng 14K & 18K"],
            ["ngoc-trai", "Ngọc trai", "Thanh lịch mỗi ngày"],
            ["da-mau", "Đá màu", "Ruby · Sapphire · Emerald"],
          ].map(([key, title, subtitle]) => (
            <Link key={key} to={`/shop?collection=${key}`}>
              <h3>{title}</h3>
              <span>{subtitle}</span>
              <b>KHÁM PHÁ →</b>
            </Link>
          ))}
        </div>
      </section>
      <section className="best-section">
        <div className="split-title">
          <div>
            <span>GỢI Ý TỪ MIRA</span>
            <h2>Thiết kế được tuyển chọn</h2>
          </div>
          <Link to="/products">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        <div className="best-grid">
          {loading &&
            Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="product-skeleton"
                aria-hidden="true"
              />
            ))}
          {best.map((p) => (
            <ProductCard key={p._id} p={p} />
          ))}
        </div>
        {loading && <p role="status">Đang tải bộ sưu tập...</p>}
        {error && (
          <div className="catalog-notice" role="alert">
            <p>{error}</p>
            <button onClick={() => setAttempt((value) => value + 1)}>
              Thử lại
            </button>
          </div>
        )}
        {!loading && !error && !best.length && (
          <p role="status">
            Bộ sưu tập đang được cập nhật. Mời bạn khám phá các dịch vụ tư vấn
            bên dưới.
          </p>
        )}
      </section>
      <section id="atelier" className="craft">
        <div className="craft-photo">
          <Image
            src="/editorial/atelier.jpg"
            alt="Chi tiết trang sức và nghệ thuật chế tác"
            loading="lazy"
          />
        </div>
        <div className="craft-copy">
          <span>CHUYỆN CHẾ TÁC</span>
          <h2>
            Nghệ thuật chế tác
            <br />
            <i>Tỉ mỉ trong từng chi tiết</i>
          </h2>
          <p>
            Từ tuyển chọn đá quý đến từng đường đánh bóng cuối cùng, mỗi tác
            phẩm MIRA đi qua đôi tay của những nghệ nhân giàu kinh nghiệm để đạt
            đến tỷ lệ, ánh sáng và cảm giác đeo hoàn hảo.
          </p>
          <div className="craft-list">
            <div>
              <Award />
              <b>Đá quý tuyển chọn</b>
              <small>
                Tiêu chuẩn khắt khe về màu sắc, độ tinh khiết và giác cắt.
              </small>
            </div>
            <div>
              <Gem />
              <b>Hoàn thiện thủ công</b>
              <small>
                Kiểm tra từng chi tiết dưới kính phóng đại trước khi bàn giao.
              </small>
            </div>
            <div>
              <ShieldCheck />
              <b>Minh bạch nguồn gốc</b>
              <small>Hồ sơ giám định và thông tin sản phẩm rõ ràng.</small>
            </div>
          </div>
          <a href="/about">
            Tìm hiểu về MIRA <ArrowRight size={14} />
          </a>
        </div>
      </section>
      <section className="tools-section" id="personal-tools">
        <div className="center-title">
          <span>MUA SẮM CÙNG MIRA</span>
          <h2>Tiện ích & dịch vụ</h2>
        </div>
        <div className="tools-grid">
          <div className="tool-card">
            <Ruler />
            <span>HƯỚNG DẪN ĐO SIZE</span>
            <h3>Tìm size nhẫn phù hợp</h3>
            <p>
              Ước tính kích thước nhẫn bằng hướng dẫn trực quan, sau đó đặt lịch
              để chuyên viên MIRA xác nhận chính xác.
            </p>
            <div className="tool-preview">
              <Ruler size={20} />
              <span>Chu vi ngón tay · Đường kính lòng nhẫn</span>
            </div>
            <Link className="gold-btn" to="/ring-sizer">
              Xem hướng dẫn đo size
            </Link>
          </div>
          <div className="tool-card">
            <BookOpen />
            <span>CHĂM SÓC TRANG SỨC</span>
            <h3>Cẩm nang bảo quản trang sức</h3>
            <p>
              Từ bạc 925 đến vàng, ngọc trai và đá quý: tìm cách vệ sinh, cất
              giữ và chăm sóc phù hợp cho món trang sức của bạn.
            </p>
            <div className="tool-preview">
              <ShieldCheck size={20} />
              <span>Vệ sinh nhẹ nhàng · Cất giữ đúng cách</span>
            </div>
            <Link className="gold-btn" to="/jewelry-care">
              Xem hướng dẫn <ArrowRight size={15} />
            </Link>
          </div>
          <div className="tool-card">
            <MessageCircle />
            <span>HỖ TRỢ KHÁCH HÀNG</span>
            <h3>Trao đổi với nhân viên</h3>
            <p>
              Trao đổi với nhân viên về sản phẩm, đơn hàng hoặc thanh toán trong
              hộp thư hỗ trợ.
            </p>
            <div className="tool-preview">
              <MessageCircle size={20} />
              <span>Sản phẩm · Đơn hàng · Thanh toán</span>
            </div>
            <Link className="gold-btn" to="/support">
              Liên hệ hỗ trợ <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
