import ProductReviews from "../components/ProductReviews";
import Image from "../components/Image";
import ProductCard from "../components/ProductCard";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request } from "../lib/api";
import { freeShippingFrom } from "../lib/commerce";
import { addCart } from "../store/cart";
import { demoProducts } from "../data/demoProducts";

type Product = {
  _id: string;
  name: string;
  category?: string;
  material: string;
  stone?: string;
  description?: string;
  rating?: number;
  stock: number;
  price: number;
  salePrice?: number;
  images?: string[];
  sizes?: string[];
  engravingAllowed?: boolean;
  slug: string;
};
const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;
export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState("");
  const [engraving, setEngraving] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setProduct(null);
    setError("");
    setNotice("");
    setEngraving("");
    setActiveImage(0);
    const show = (data: Product) => {
      if (active) {
        setProduct(data);
        setSize(data.sizes?.[0] || "Tiêu chuẩn");
      }
    };
    request(`/products/${encodeURIComponent(slug || "")}`)
      .then((data: Product) => {
        show(data);
        if (!data._id.startsWith("demo-"))
          request("/behaviors", {
            method: "POST",
            body: JSON.stringify({ type: "VIEW", product: data._id }),
          }).catch(() => undefined);
      })
      .catch((error) => {
        if (!active) return;
        const fallback =
          error.status !== 404
            ? demoProducts.find((p) => p.slug === slug)
            : undefined;
        if (fallback) show(fallback);
        else
          setError(
            error.status === 404
              ? "Không tìm thấy sản phẩm."
              : "Không tải được sản phẩm. Vui lòng thử lại.",
          );
      });
    request("/products")
      .then((data) => {
        if (active) setRelated(data);
      })
      .catch(() => {
        if (active) setRelated(demoProducts);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  if (error)
    return (
      <section className="lux-empty" role="alert">
        <h2>{error}</h2>
        <Link to="/shop">Về bộ sưu tập</Link>
      </section>
    );
  if (!product)
    return (
      <div className="pd-loading" role="status">
        Đang tải sản phẩm...
      </div>
    );
  const images = product.images?.length ? product.images : ["/placeholder.svg"];
  const sizes = product.sizes?.length ? product.sizes : ["Tiêu chuẩn"];
  const price = product.salePrice ?? product.price;
  const soldOut = product.stock <= 0;
  const matches = related
    .filter(
      (p) =>
        p._id !== product._id &&
        (p.category === product.category || p.stone === product.stone),
    )
    .slice(0, 4);
  function add(buyNow = false) {
    if (!product || soldOut) return;
    const added = addCart({
      _id: product._id,
      slug: product.slug,
      name: product.name,
      price,
      image: images[activeImage],
      size,
      quantity: 1,
      material: product.material,
      stone: product.stone,
      engraving: product.engravingAllowed ? engraving.trim() : "",
      stock: product.stock,
    });
    if (!added) {
      setNotice("Số lượng trong giỏ đã đạt tồn kho hiện tại.");
      return;
    }
    setNotice("Đã thêm sản phẩm vào giỏ hàng.");
    if (!product._id.startsWith("demo-"))
      request("/behaviors", {
        method: "POST",
        body: JSON.stringify({ type: "ADD_CART", product: product._id }),
      }).catch(() => undefined);
    if (buyNow) navigate("/cart");
  }
  return (
    <main className="pd-page">
      <div className="product-breadcrumb">
        <Link to="/shop">Bộ sưu tập</Link>
        <span>/</span>
        <Link
          to={`/shop?category=${encodeURIComponent(product.category || "")}`}
        >
          {product.category}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>
      <section className="pd-product">
        <ProductGallery
          name={product.name}
          images={images}
          activeImage={activeImage}
          onSelect={setActiveImage}
        />
        <div className="pd-config">
          <div className="pd-meta">
            <span>
              {product.category} · {product.stone || "Không đính đá"}
            </span>
            <span>SKU: MIRA-{product._id.slice(-6).toUpperCase()}</span>
          </div>
          <h1>{product.name}</h1>
          <div className="pd-price-box">
            <h2>{money(price)}</h2>
            {product.salePrice !== undefined &&
              product.salePrice < product.price && (
                <del>{money(product.price)}</del>
              )}
            <p>Giá theo chất liệu và kích cỡ sản phẩm đã chọn.</p>
            <span className="pd-ship">
              MIỄN PHÍ VẬN CHUYỂN TỪ {money(freeShippingFrom)}
            </span>
          </div>
          <dl className="product-specs">
            <div>
              <dt>Chất liệu</dt>
              <dd>{product.material}</dd>
            </div>
            <div>
              <dt>Loại đá / điểm nhấn</dt>
              <dd>{product.stone || "Không đính đá"}</dd>
            </div>
            <div>
              <dt>Tình trạng</dt>
              <dd>
                {soldOut ? "Tạm hết hàng" : `Còn ${product.stock} sản phẩm`}
              </dd>
            </div>
          </dl>
          <OptionTitle
            title="KÍCH CỠ / CHIỀU DÀI"
            value={
              product.category === "Nhẫn"
                ? "Chọn theo kích cỡ nhẫn của bạn"
                : "Chọn kích thước phù hợp"
            }
          />
          <div className="pd-sizes">
            {sizes.map((value) => (
              <button
                key={value}
                aria-pressed={size === value}
                className={size === value ? "active" : ""}
                onClick={() => {
                  setSize(value);
                  setNotice("");
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="pd-size-note">
            {product.category === "Nhẫn"
              ? "Chưa rõ size? Liên hệ tư vấn trước khi đặt hàng."
              : product.category === "Bông tai"
                ? "Bông tai được bán theo đôi."
                : product.category === "Charm"
                  ? "Charm được bán riêng; chưa bao gồm dây hoặc vòng."
                  : "Kiểm tra chiều dài và kích cỡ trước khi đặt hàng."}
          </p>
          {product.engravingAllowed && (
            <div className="pd-engraving">
              <div>
                <b>KHẮC TÊN CÁ NHÂN HÓA</b>
                <span>TÙY CHỌN</span>
              </div>
              <input
                aria-label="Nội dung khắc"
                maxLength={16}
                value={engraving}
                placeholder="Ví dụ: Forever Yours"
                onChange={(e) => setEngraving(e.target.value)}
              />
              <small>
                <i>Xem trước: “{engraving || "Tên hoặc lời nhắn của bạn"}”</i>
                <span>{engraving.length}/16</span>
              </small>
            </div>
          )}
          <div className="pd-actions">
            <button className="pd-add" disabled={soldOut} onClick={() => add()}>
              {soldOut ? "TẠM HẾT HÀNG" : "THÊM VÀO GIỎ HÀNG"}
            </button>
            <button
              className="pd-buy"
              disabled={soldOut}
              onClick={() => add(true)}
            >
              MUA NGAY BẰNG 1 CHẠM
            </button>
          </div>
          {notice && (
            <p role="status" className="cart-notice">
              {notice} <Link to="/cart">Xem giỏ hàng →</Link>
            </p>
          )}
          <button className="pd-salon" onClick={() => navigate("/advisor")}>
            TƯ VẤN CHẤT LIỆU & KÍCH CỠ
          </button>
          <div className="pd-trust">
            <Trust
              icon="◇"
              title="Chất Liệu Rõ Ràng"
              text="Vàng · Bạc · Ngọc trai · Đá quý"
            />
            <Trust
              icon="▣"
              title="Giao Hàng Cẩn Thận"
              text="Đóng gói bảo vệ sản phẩm"
            />
            <Trust
              icon="↻"
              title="Hỗ Trợ Sau Mua"
              text="Tư vấn chăm sóc trang sức"
            />
          </div>
        </div>
      </section>
      {product.description && (
        <section className="pd-services">
          <h2>Thông tin sản phẩm</h2>
          <p>{product.description}</p>
        </section>
      )}
      <ProductReviews key={product._id} slug={product.slug} />
      <ServiceSection />
      {!!matches.length && (
        <section className="related-products">
          <h2>Có Thể Bạn Cũng Thích</h2>
          <div className="shop-grid">
            {matches.map((p) => (
              <ProductCard key={p._id} p={p} />
            ))}
          </div>
        </section>
      )}
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
        <div className="pd-badges">
          <span>MIRA JEWELRY</span>
          <span>MIRA COLLECTION</span>
        </div>
        <Image src={images[activeImage]} alt={name} />
        <span className="pd-360">ẢNH MINH HỌA SẢN PHẨM</span>
      </div>

      <div className="pd-thumbs">
        {images.slice(0, 4).map((image, index) => (
          <button
            key={`${image}-${index}`}
            className={activeImage === index ? "active" : ""}
            onClick={() => onSelect(index)}
          >
            <Image src={image} alt={`${name} - ảnh ${index + 1}`} />
          </button>
        ))}
      </div>

      <div className="pd-insurance">
        <div>
          <b>ĐÓNG GÓI & CHĂM SÓC TRANG SỨC</b>
          <p>
            Sản phẩm được đóng gói cẩn thận, kèm hướng dẫn bảo quản theo chất
            liệu.
          </p>
        </div>
        <span>MIRA CARE</span>
      </div>
    </div>
  );
}

function OptionTitle({ title, value }: { title: string; value: string }) {
  return (
    <div className="pd-option-title">
      <b>{title}</b>
      <span>{value}</span>
    </div>
  );
}

function Trust({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <span>{icon}</span>
      <b>{title}</b>
      <small>{text}</small>
    </div>
  );
}

function ServiceSection() {
  const services = [
    [
      "◇",
      "Hộp Đựng Trang Sức",
      "Đóng gói bảo vệ sản phẩm khi vận chuyển và bảo quản.",
    ],
    ["⌕", "Hướng Dẫn Làm Sạch", "Bộ chăm sóc phù hợp với chất liệu trang sức."],
    [
      "♢",
      "Tư Vấn Chăm Sóc Trang Sức",
      "Hướng dẫn bảo quản vàng, bạc, ngọc trai và đá quý.",
    ],
    [
      "∞",
      "Hỗ Trợ Sau Mua",
      "Vệ sinh, đánh bóng và hỗ trợ chỉnh size tại MIRA Salon.",
    ],
  ];

  return (
    <section className="pd-services">
      <p className="pd-eyebrow">ĐẶC QUYỀN KHÁCH HÀNG MIRA</p>
      <h2>Đóng Gói & Chăm Sóc Sau Mua</h2>
      <div className="pd-service-grid">
        {services.map(([icon, title, text]) => (
          <article key={title}>
            <span>{icon}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
