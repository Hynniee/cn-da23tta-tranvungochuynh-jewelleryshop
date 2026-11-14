import ProductReviews from "../components/ProductReviews";
import Image from "../components/Image";
import ProductCard from "../components/ProductCard";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request } from "../lib/api";
import { freeShippingFrom } from "../lib/commerce";
import { addCart } from "../store/cart";
import { BUY_NOW_CHECKOUT, saveBuyNow } from "../store/buy-now";
import { notify } from "../lib/notifications";
import { trackBehavior } from "../lib/behavior";
import { productSizes } from "../lib/product-sizes";
import RingSizeGuide from "../components/RingSizeGuide";
import ProductFitGuide from "../components/ProductFitGuide";

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
  promotion?: { name: string; type: string; endsAt: string };
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
  const [sizeError, setSizeError] = useState("");
  const [engraving, setEngraving] = useState("");
  const productSection = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!product?._id || !productSection.current) return;
    const target =
      window.location.hash === "#purchase"
        ? document.getElementById("purchase") || productSection.current
        : productSection.current;
    target.scrollIntoView({
      block: "start",
      behavior: "instant",
    });
    target.focus({ preventScroll: true });
  }, [product?._id]);
  useEffect(() => {
    let active = true;
    setProduct(null);
    setError("");
    setEngraving("");
    setSizeError("");
    setActiveImage(0);
    const show = (data: Product) => {
      if (active) {
        setProduct(data);
        setSize("");
      }
    };
    request(`/products/${encodeURIComponent(slug || "")}`)
      .then((data: Product) => {
        show(data);
        if (!data._id.startsWith("demo-"))
          trackBehavior("VIEW", { product: data._id });
      })
      .catch((error) => {
        if (!active) return;
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
        if (active) setRelated([]);
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
  const sizes = productSizes(product);
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
    if (sizes.length && !sizes.includes(size)) {
      setSizeError("Vui lòng chọn kích cỡ trước khi mua sản phẩm.");
      document
        .getElementById("product-size-options")
        ?.focus({ preventScroll: true });
      return;
    }
    const selection = {
      _id: product._id,
      slug: product.slug,
      name: product.name,
      price,
      image: images[activeImage],
      size,
      sizeOptions: sizes,
      quantity: 1,
      material: product.material,
      stone: product.stone,
      engraving: product.engravingAllowed ? engraving.trim() : "",
      stock: product.stock,
    };
    if (buyNow) {
      try {
        saveBuyNow(selection);
        navigate(BUY_NOW_CHECKOUT);
      } catch {
        notify(
          "Chưa thể bắt đầu mua ngay. Vui lòng cho phép lưu dữ liệu trên trình duyệt rồi thử lại.",
          "info",
        );
      }
      return;
    }
    const added = addCart(selection);
    if (!added) {
      notify("Số lượng trong giỏ đã đạt tồn kho hiện tại.", "info");
      return;
    }
    notify("Đã thêm sản phẩm vào giỏ hàng.");
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
      <section
        className="pd-product"
        ref={productSection}
        tabIndex={-1}
        aria-label="Ảnh và thông tin sản phẩm"
      >
        <ProductGallery
          name={product.name}
          images={images}
          activeImage={activeImage}
          onSelect={setActiveImage}
        />
        <div className="pd-config" id="purchase" tabIndex={-1}>
          <div className="pd-meta">
            <span>
              {product.category} · {product.stone || "Không đính đá"}
            </span>
            <span>SKU: MIRA-{product._id.slice(-6).toUpperCase()}</span>
          </div>
          <h1>{product.name}</h1>
          <div className="pd-price-box">
            <h2>{money(price)}</h2>
            {price < product.price && (
              <del className="original-price">{money(product.price)}</del>
            )}
            {product.promotion && (
              <p className="product-promotion-note">
                <b>
                  {product.promotion.type === "flash_sale"
                    ? "Flash sale"
                    : "Ưu đãi"}
                  : {product.promotion.name}
                </b>
                <br />
                Kết thúc{" "}
                {new Date(product.promotion.endsAt).toLocaleString("vi-VN")}
              </p>
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
          {sizes.length > 0 ? (
            <>
              {product.category === "Nhẫn" ||
              product.category === "Nhẫn cưới" ? (
                <div className="pd-option-title">
                  <b>Chọn size nhẫn (ni Việt Nam)</b>
                  <RingSizeGuide selectedSize={size} />
                </div>
              ) : (
                <OptionTitle
                  title="Chọn kích cỡ / chiều dài"
                  value="Chọn kích thước phù hợp"
                />
              )}
              <div
                className="pd-sizes"
                id="product-size-options"
                role="group"
                aria-label="Chọn kích cỡ sản phẩm"
                aria-describedby={
                  sizeError ? "product-size-error" : "product-size-help"
                }
                tabIndex={-1}
              >
                {sizes.map((value) => (
                  <button
                    key={value}
                    aria-pressed={size === value}
                    className={size === value ? "active" : ""}
                    onClick={() => {
                      setSize(value);
                      setSizeError("");
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {sizeError && (
                <p
                  id="product-size-error"
                  className="pd-size-error"
                  role="alert"
                >
                  {sizeError}
                </p>
              )}
              <p id="product-size-help" className="pd-size-note">
                {product.category === "Nhẫn" ||
                product.category === "Nhẫn cưới" ? (
                  <Link to="/ring-sizer">
                    Chưa rõ size? Xem hướng dẫn đo size nhẫn →
                  </Link>
                ) : (
                  "Chọn chiều dài phù hợp với số đo của bạn."
                )}
              </p>
            </>
          ) : (
            <p className="pd-size-note">
              {product.category === "Bông tai"
                ? "Bông tai được bán theo đôi."
                : product.category === "Charm"
                  ? "Charm được bán riêng; chưa bao gồm dây hoặc vòng."
                  : "Sản phẩm theo kích thước thiết kế, không cần chọn size."}
            </p>
          )}
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
              MUA NGAY
            </button>
          </div>
          <ProductFitGuide
            name={product.name}
            material={product.material}
            stone={product.stone}
            category={product.category}
            sizes={sizes}
            selectedSize={size}
          />
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
