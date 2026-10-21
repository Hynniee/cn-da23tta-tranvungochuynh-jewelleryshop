import Image from "../components/Image";
import { Link } from "react-router-dom";
import { ArrowLeft, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { useCartController } from "../controllers/useCartController";

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

export default function Cart() {
  const {
    cart,
    checking,
    notice,
    inStock,
    subtotal,
    shipping,
    total,
    updateQuantity,
    canIncrease,
  } = useCartController();

  return (
    <main className="lux-cart-page">
      <div className="page-kicker">MIRA PRIVATE PURCHASE</div>
      <div className="cart-title-row">
        <div>
          <h1>Giỏ Hàng Của Bạn</h1>
          <p>{cart.length} tuyệt tác đang chờ được sở hữu.</p>
        </div>
        <Link to="/products">
          <ArrowLeft size={14} /> Tiếp tục khám phá
        </Link>
      </div>

      {notice && <p role="alert">{notice}</p>}
      {!inStock && (
        <p role="alert">
          Một số sản phẩm đã hết hàng hoặc vượt tồn kho. Vui lòng giảm số lượng
          hoặc xóa sản phẩm trước khi thanh toán.
        </p>
      )}
      {!cart.length ? (
        <section className="lux-empty">
          <span>◇</span>
          <h2>Giỏ hàng đang trống</h2>
          <p>Khám phá những tuyệt tác kim hoàn được tuyển chọn bởi MIRA.</p>
          <Link to="/products" className="gold-btn">
            KHÁM PHÁ BỘ SƯU TẬP
          </Link>
        </section>
      ) : (
        <div className="lux-cart-layout">
          <section className="lux-cart-items">
            {cart.map((item, index) => (
              <article
                className="lux-cart-item"
                key={`${item._id}-${item.size}-${index}`}
              >
                <Image src={item.image} alt={item.name} />
                <div className="cart-item-copy">
                  <small>MIRA · FINE JEWELRY</small>
                  <h3>{item.name}</h3>
                  <p>
                    {item.material || "Trang sức MIRA"} · {item.stone || ""} ·{" "}
                    {item.carat ? `${item.carat} ct · ` : ""}Size {item.size}
                  </p>
                  {item.engraving && <em>Khắc: “{item.engraving}”</em>}
                  <strong>{money(item.price)}</strong>
                </div>
                <div className="lux-qty">
                  <button
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    disabled={!canIncrease(index)}
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="lux-remove"
                  onClick={() => updateQuantity(index, 0)}
                  aria-label="Xóa sản phẩm"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </section>

          <aside className="lux-summary">
            <span className="page-kicker">ORDER SUMMARY</span>
            <h2>Tóm Tắt Đơn Hàng</h2>
            <div>
              <span>Tạm tính</span>
              <b>{money(subtotal)}</b>
            </div>
            <div>
              <span>Vận chuyển bảo mật</span>
              <b>{shipping ? money(shipping) : "Miễn phí"}</b>
            </div>
            <div>
              <span>Bảo hiểm vận chuyển</span>
              <b>Đã bao gồm</b>
            </div>
            <hr />
            <div className="lux-total">
              <span>Tổng thanh toán</span>
              <b>{money(total)}</b>
            </div>
            <small>Đã bao gồm VAT và hồ sơ giám định đi kèm sản phẩm.</small>
            {inStock && !checking && !notice ? (
              <Link to="/checkout" className="summary-checkout">
                TIẾN HÀNH THANH TOÁN
              </Link>
            ) : (
              <button className="summary-checkout" disabled>
                {checking ? "ĐANG KIỂM TRA..." : "KIỂM TRA GIỎ HÀNG"}
              </button>
            )}
            <p className="secure-line">
              <LockKeyhole size={13} /> Thanh toán bảo mật SSL 256-bit
            </p>
            <p className="secure-line">
              <ShieldCheck size={13} /> Hỗ trợ thu đổi minh bạch theo chính sách
              MIRA
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
