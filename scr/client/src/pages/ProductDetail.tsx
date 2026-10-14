import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { request } from "../lib/api";
import { addCart } from "../store/cart";
import { demoProducts } from "../data/demoProducts";

type Product = {
  _id: string;
  name: string;
  material?: string;
  price: number;
  salePrice?: number;
  images?: string[];
  sizes?: string[];
};

type Material = {
  name: string;
  tone: "platinum" | "white" | "yellow" | "rose";
  extraPrice: number;
};

const MATERIALS: Material[] = [
  { name: "Platinum 950", tone: "platinum", extraPrice: 0 },
  { name: "Vàng Trắng 18K", tone: "white", extraPrice: 6_000_000 },
  { name: "Vàng Vàng 18K", tone: "yellow", extraPrice: 6_000_000 },
  { name: "Vàng Hồng 18K", tone: "rose", extraPrice: 6_000_000 },
];

const CARATS = [
  { value: "1.0", diameter: "6.5 mm" },
  { value: "1.2", diameter: "6.9 mm" },
  { value: "1.5", diameter: "7.35 mm", recommended: true },
  { value: "2.0", diameter: "8.2 mm" },
];

const DEFAULT_SIZES = ["8", "9", "10", "11", "12", "13", "14", "15", "16"];

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState("12");
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [carat, setCarat] = useState(CARATS[2]);
  const [engraving, setEngraving] = useState("");

  useEffect(() => {
    if (!slug) return;

    request(`/products/${slug}`).then((data: Product) => {
      setProduct(data); setSize(data.sizes?.[0] || "12");
      setMaterial(MATERIALS.find((item) => item.name === data.material) || MATERIALS[0]);
      if (!String(data._id).startsWith("demo-")) request("/behaviors",{method:"POST",body:JSON.stringify({type:"VIEW",product:data._id})}).catch(()=>undefined);
    }).catch(() => {
      const demo = demoProducts.find((item) => item.slug === slug);
      if (demo) { setProduct(demo as Product); setSize(demo.sizes?.[0] || "12"); setMaterial(MATERIALS.find((item) => item.name === demo.material) || MATERIALS[0]); }
    });
  }, [slug]);

  const images = useMemo(
    () => (product?.images?.length ? product.images : ["/placeholder.jpg"]),
    [product]
  );

  if (!product) return <div className="pd-loading">Đang tải tuyệt tác...</div>;

  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const basePrice = Number(product.salePrice || product.price);
  const finalPrice = basePrice + material.extraPrice;

  const addSelectionToCart = () => {
    addCart({
      _id: product._id,
      name: product.name,
      price: finalPrice,
      image: images[activeImage],
      size,
      quantity: 1,
    });
  };

  const handleAddToCart = () => {
    addSelectionToCart();
    if (!String(product._id).startsWith("demo-")) request("/behaviors",{method:"POST",body:JSON.stringify({type:"ADD_CART",product:product._id})}).catch(()=>undefined);
    window.alert("Đã thêm tuyệt tác vào giỏ hàng");
  };

  const handleBuyNow = () => {
    addSelectionToCart();
    navigate("/cart");
  };

  return (
    <main className="pd-page">
      <section className="pd-product">
        <ProductGallery
          name={product.name}
          images={images}
          activeImage={activeImage}
          onSelect={setActiveImage}
        />

        <div className="pd-config">
          <div className="pd-meta">
            <span>COLLECTION · L'AMOUR ÉTERNEL</span>
            <span>SKU: MIRA-{product._id.slice(-6).toUpperCase()}</span>
          </div>

          <h1>{product.name}</h1>

          <div className="pd-rating">
            <span className="pd-stars">★★★★★</span>
            <strong>4.9 / 5.0</strong>
            <span>86 đánh giá thượng khách</span>
          </div>

          <div className="pd-price-box">
            <h2>{money(finalPrice)}</h2>
            <p>Đã bao gồm VAT & bộ hồ sơ kim cương GIA quốc tế.</p>
            <span className="pd-ship">MIỄN PHÍ SHIP HỎA TỐC BẢO MẬT</span>
            <div>Trả góp 0% từ <b>{money(Math.round(finalPrice / 12))}/tháng</b></div>
          </div>

          <OptionTitle title="CHẤT LIỆU KIM LOẠI QUÝ" value={material.name} />
          <div className="pd-materials">
            {MATERIALS.map((item) => (
              <button
                key={item.name}
                className={material.name === item.name ? "active" : ""}
                onClick={() => setMaterial(item)}
              >
                <i className={`pd-metal ${item.tone}`} />
                <b>{item.name}</b>
                <small>{item.extraPrice ? `+${money(item.extraPrice)}` : "Tiêu chuẩn"}</small>
              </button>
            ))}
          </div>

          <OptionTitle title="TRỌNG LƯỢNG KIM CƯƠNG CHỦ" value={`Đường kính ~ ${carat.diameter}`} />
          <div className="pd-carats">
            {CARATS.map((item) => (
              <button
                key={item.value}
                className={carat.value === item.value ? "active" : ""}
                onClick={() => setCarat(item)}
              >
                <b>{item.value} ct</b>
                <small>{item.recommended ? "Khuyên dùng" : item.diameter}</small>
              </button>
            ))}
          </div>

          <OptionTitle title="KÍCH CỠ NHẪN (CHUẨN VN / QUỐC TẾ)" value="Hướng dẫn đo size tại nhà" />
          <div className="pd-sizes">
            {sizes.map((item) => (
              <button
                key={item}
                className={size === item ? "active" : ""}
                onClick={() => setSize(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="pd-size-note">Miễn phí đổi/thu size 1 lần trong 90 ngày sau khi nhận tác phẩm.</p>

          <div className="pd-engraving">
            <div><b>KHẮC LASER CÁ NHÂN HÓA</b><span>TẶNG KÈM MIỄN PHÍ</span></div>
            <input
              maxLength={16}
              value={engraving}
              placeholder="Ví dụ: Forever Yours · ∞"
              onChange={(event) => setEngraving(event.target.value)}
            />
            <small><i>Xem trước: “{engraving || "Forever Yours"}”</i><span>{engraving.length}/16</span></small>
          </div>

          <div className="pd-actions">
            <button className="pd-add" onClick={handleAddToCart}>THÊM VÀO GIỎ HÀNG</button>
            <button className="pd-buy" onClick={handleBuyNow}>MUA NGAY BẰNG 1 CHẠM</button>
          </div>

          <button className="pd-salon">ĐẶT LỊCH CHIÊM NGƯỠNG RIÊNG TẠI PRIVATE SALON</button>

          <div className="pd-trust">
            <Trust icon="▣" title="Bảo Mật Tuyệt Đối" text="Vận chuyển bảo mật" />
            <Trust icon="◇" title="GIA Laser Report" text="Mã số cạnh kim cương" />
            <Trust icon="↻" title="Thu Đổi Minh Bạch" text="Cam kết rõ ràng" />
          </div>
        </div>
      </section>

      <GiaSection carat={carat.value} />
      <ServiceSection />
      <ReviewSection images={images} />
    </main>
  );
}

function ProductGallery({
  name,
  images,
  activeImage,
  onSelect,
}: {
  name: string;
  images: string[];
  activeImage: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="pd-gallery">
      <div className="pd-main-image">
        <div className="pd-badges"><span>GIA CERTIFIED</span><span>PIÈCE UNIQUE</span></div>
        <img src={images[activeImage]} alt={name} />
        <span className="pd-360">360° & ÁNH SÁNG</span>
      </div>

      <div className="pd-thumbs">
        {images.slice(0, 4).map((image, index) => (
          <button key={`${image}-${index}`} className={activeImage === index ? "active" : ""} onClick={() => onSelect(index)}>
            <img src={image} alt={`${name} - ảnh ${index + 1}`} />
          </button>
        ))}
      </div>

      <div className="pd-insurance">
        <div>
          <b>BẢO HIỂM KIM HOÀN TOÀN DIỆN NĂM ĐẦU</b>
          <p>Bảo hộ đá chủ, kèm vệ sinh và đánh bóng trọn đời tại MIRA Salon.</p>
        </div>
        <span>HẠNG VIP</span>
      </div>
    </div>
  );
}

function OptionTitle({ title, value }: { title: string; value: string }) {
  return <div className="pd-option-title"><b>{title}</b><span>{value}</span></div>;
}

function Trust({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div><span>{icon}</span><b>{title}</b><small>{text}</small></div>;
}

function GiaSection({ carat }: { carat: string }) {
  const specs = [
    ["01.", "TRỌNG LƯỢNG", `${carat} Carat`, "Tỷ lệ kích thước tuyển chọn để viên đá nổi bật khi lên tay."],
    ["02.", "NƯỚC MÀU", "Grade E", "Nhóm gần như không màu, cho ánh sáng trắng trong và tinh khiết."],
    ["03.", "ĐỘ TINH KHIẾT", "VVS1", "Tạp chất cực vi mô, rất khó quan sát dưới độ phóng đại chuyên dụng."],
    ["04.", "GIÁC CẮT", "3X Excellent", "Cut, Polish và Symmetry cùng đạt Excellent để tối ưu độ lửa."],
  ];

  return (
    <section className="pd-gia">
      <div className="pd-section-head">
        <div><p className="pd-eyebrow">TIÊU CHUẨN GIÁM ĐỊNH TOÀN CẦU</p><h2>Hồ Sơ 4Cs & Chứng Thư GIA Của Viên Đá Chủ</h2></div>
        <button>GIA REPORT #2487901244</button>
      </div>

      <div className="pd-4cs">
        {specs.map(([number, label, value, text]) => (
          <article key={label}>
            <span>{number} {label}</span><h3>{value}</h3><p>{text}</p><i />
          </article>
        ))}
      </div>

      <div className="pd-laser">
        <div>
          <p className="pd-eyebrow">KHẮC CẠNH KÍNH HIỂN VI</p>
          <h3>Mã Số GIA Laser Micro-Inscription</h3>
          <p>Mã GIA được khắc vi điểm trên cạnh viên đá để đối chiếu trực tiếp với giấy chứng nhận trước khi bàn giao.</p>
          <b>✓ Không ảnh hưởng phản quang &nbsp;&nbsp; ✓ Nhận diện độc bản</b>
        </div>
        <div className="pd-gia-number">GIA 2487901244</div>
      </div>
    </section>
  );
}

function ServiceSection() {
  const services = [
    ["◇", "Hộp Da Nệm Nhung Đèn LED", "Hộp trình bày cao cấp làm nổi bật ánh lửa của viên đá."],
    ["⌕", "Khăn Lau Microfiber & Loupe", "Bộ chăm sóc và kiểm tra mã GIA chuyên dụng."],
    ["♢", "Bảo Hiểm Kim Cương 1 Năm", "Quyền lợi bảo hộ năm đầu dành cho tác phẩm MIRA."],
    ["∞", "Spa & Chỉnh Size Trọn Đời", "Vệ sinh, đánh bóng và hỗ trợ chỉnh size tại MIRA Salon."],
  ];

  return (
    <section className="pd-services">
      <p className="pd-eyebrow">ĐẶC QUYỀN KHÁCH HÀNG MIRA</p>
      <h2>Nghi Thức Bàn Giao & Dịch Vụ Vĩnh Cửu</h2>
      <div className="pd-service-grid">
        {services.map(([icon, title, text]) => <article key={title}><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
    </section>
  );
}

function ReviewSection({ images }: { images: string[] }) {
  const reviews = [
    ["Trần Hoàng Long", "Hà Nội"],
    ["Mai Anh & Quốc Đạt", "TP. HCM"],
    ["Vũ Khang", "Đà Nẵng"],
  ];

  return (
    <section className="pd-reviews">
      <div className="pd-review-head">
        <div><p className="pd-eyebrow">CHIA SẺ THỰC TẾ</p><h2>Đánh Giá & Khoảnh Khắc Cầu Hôn</h2></div>
        <div><b>4.9 / 5.0</b><small>Dựa trên 86 đơn hàng xác thực</small></div>
      </div>
      <div className="pd-review-grid">
        {reviews.map(([name, location], index) => (
          <article key={name}>
            <header><span>{name[0]}</span><div><b>{name}</b><small>Đã mua hàng · {location}</small></div><strong>★★★★★</strong></header>
            <p>“Tác phẩm hoàn thiện rất đẹp. Chuyên viên tư vấn kỹ từng thông số và cho kiểm tra chứng nhận GIA trước khi nhận nhẫn.”</p>
            <img src={images[Math.min(index + 1, images.length - 1)]} alt={name} />
          </article>
        ))}
      </div>
    </section>
  );
}
