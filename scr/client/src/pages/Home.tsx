import Image from "../components/Image";
import {
  ArrowRight,
  Award,
  Diamond,
  Gem,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { request } from "../lib/api";
import { demoProducts } from "../data/demoProducts";
import ProductCard from "../components/ProductCard";
const cats = [
  [
    "NHẪN",
    "Biểu tượng của lời hứa vĩnh cửu",
    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "DÂY CHUYỀN",
    "Ánh sáng chạm gần trái tim",
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "BÔNG TAI",
    "Điểm sáng của khí chất",
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "LẮC & VÒNG TAY",
    "Nhịp điệu của sự thanh lịch",
    "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=85",
  ],
];
export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    request("/products")
      .then(setProducts)
      .catch(() => setProducts(demoProducts));
  }, []);
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
        <Image src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1800&q=90" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span>MAISON MIRA · FINE JEWELRY</span>
          <h1>
            Kiệt Tác Kim Hoàn
            <br />
            <i>Nơi Ánh Sáng Hội Tụ</i>
          </h1>
          <p>
            Trang sức vàng, bạc, ngọc trai và đá màu — những thiết kế giúp bạn
            thể hiện phong cách riêng mỗi ngày.
          </p>
          <div>
            <Link to="/products" className="gold-btn">
              KHÁM PHÁ BỘ SƯU TẬP <ArrowRight size={15} />
            </Link>
            <a href="#atelier" className="ghost-btn">
              BESPOKE ATELIER
            </a>
          </div>
        </div>
        <div className="hero-values">
          <span>
            <Diamond />
            VÀNG · BẠC · ĐÁ QUÝ
            <br />
            <small>Chất liệu rõ ràng</small>
          </span>
          <span>
            <ShieldCheck />
            BẢO CHỨNG TRỌN ĐỜI
            <br />
            <small>Thu đổi minh bạch</small>
          </span>
          <span>
            <Sparkles />
            CHẾ TÁC THỦ CÔNG
            <br />
            <small>Hoàn thiện bởi nghệ nhân</small>
          </span>
        </div>
      </section>
      <section className="home-section">
        <div className="center-title">
          <span>THE MIRA ICONS</span>
          <h2>Danh Mục Biểu Tượng</h2>
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
              <Image src={c[2]} />
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
          <span>FIND YOUR EVERYDAY SPARKLE</span>
          <h2>Trang Sức Cho Mọi Phong Cách</h2>
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
            <span>THE HOUSE SELECTION</span>
            <h2>Thiết Kế Được Tuyển Chọn</h2>
          </div>
          <Link to="/products">
            XEM TẤT CẢ <ArrowRight size={14} />
          </Link>
        </div>
        <div className="best-grid">
          {best.map((p) => (
            <ProductCard key={p._id} p={p} />
          ))}
        </div>
      </section>
      <section id="atelier" className="craft">
        <div className="craft-photo">
          <Image src="https://images.unsplash.com/photo-1627293509201-cd0c780043e6?auto=format&fit=crop&w=1100&q=85" />
        </div>
        <div className="craft-copy">
          <span>THE ART OF MIRA</span>
          <h2>
            Nghệ Thuật Chế Tác
            <br />
            <i>Không Thỏa Hiệp</i>
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
            KHÁM PHÁ BESPOKE ATELIER <ArrowRight size={14} />
          </a>
        </div>
      </section>
      <section className="tools-section">
        <div className="center-title">
          <span>PERSONALIZED EXPERIENCE</span>
          <h2>Công Cụ Dành Riêng Cho Bạn</h2>
        </div>
        <div className="tools-grid">
          <div className="tool-card">
            <Ruler />
            <span>SMART RING SIZER</span>
            <h3>Tìm Size Nhẫn Hoàn Hảo</h3>
            <p>
              Ước tính kích thước nhẫn bằng hướng dẫn trực quan, sau đó đặt lịch
              để chuyên viên MIRA xác nhận chính xác.
            </p>
            <div className="fake-slider">
              <i />
              <b>12</b>
            </div>
            <Link className="gold-btn" to="/advisor">
              TƯ VẤN SIZE NHẪN
            </Link>
          </div>
          <div className="tool-card dark">
            <Diamond />
            <span>JEWELRY CONCIERGE</span>
            <h3>Trang Sức Dành Cho Bạn</h3>
            <p>
              Trả lời vài câu hỏi về ngân sách, phong cách và khoảnh khắc để
              nhận gợi ý trang sức phù hợp.
            </p>
            <div className="quiz-tags">
              <b>ĐÍNH HÔN</b>
              <b>KỶ NIỆM</b>
              <b>QUÀ TẶNG</b>
            </div>
            <Link className="gold-btn" to="/advisor">
              BẮT ĐẦU TƯ VẤN
            </Link>
          </div>
        </div>
      </section>
      <section className="press">
        <div className="center-title">
          <span>AS SEEN & FELT</span>
          <h2>Tiếng Vang Di Sản</h2>
        </div>
        <div className="press-grid">
          <blockquote>
            “Một ngôn ngữ thiết kế thanh lịch, nơi kỹ nghệ kim hoàn gặp tinh
            thần đương đại.”<b>— THE LUXURY EDIT</b>
          </blockquote>
          <blockquote>
            “Trải nghiệm Private Salon khiến việc lựa chọn nhẫn trở thành một
            nghi thức thực sự riêng tư.”<b>— MODERN BRIDE</b>
          </blockquote>
          <blockquote>
            “Sự minh bạch về kim cương và tiêu chuẩn hoàn thiện là điểm nổi bật
            của MIRA.”<b>— STYLE JOURNAL</b>
          </blockquote>
        </div>
      </section>
    </div>
  );
}
