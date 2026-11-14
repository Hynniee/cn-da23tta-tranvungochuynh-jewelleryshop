import { shippingFee } from "../lib/commerce";
import Image from "../components/Image";
import ShippingAddressFields, {
  ShippingAddressValue,
} from "../components/ShippingAddressFields";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CreditCard, LockKeyhole, Truck } from "lucide-react";
import {
  getCart,
  saveCart,
  reconcileCart,
  reconcileItems,
  cartHasStock,
  cartHasValidSizes,
} from "../store/cart";
import { BUY_NOW_CHECKOUT, clearBuyNow, getBuyNow } from "../store/buy-now";
import { request, token } from "../lib/api";
import usePromotionQuote from "../controllers/usePromotionQuote";
import VoucherField from "../components/VoucherField";
import PaymentTransfer, {
  type TransferDetails,
} from "../components/PaymentTransfer";
import { notify } from "../lib/notifications";
import useAddressBook from "../controllers/useAddressBook";

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

export default function Checkout() {
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const buyNow = params.get("buyNow") === "1" && !orderId;
  const [loadingPayment, setLoadingPayment] = useState(Boolean(orderId));
  const [cart, setCart] = useState(() => (buyNow ? getBuyNow() : getCart()));
  const [checkingCart, setCheckingCart] = useState(!orderId);
  const [cartReady, setCartReady] = useState(false);
  const validSizes = cartHasValidSizes(cart);
  const promotion = usePromotionQuote(
    cart,
    !orderId && cartReady && validSizes,
  );
  const navigate = useNavigate();
  const addressBook = useAddressBook(!orderId && Boolean(token()));
  const [addressChoice, setAddressChoice] = useState("new");
  const selectedAddress =
    addressChoice === "new"
      ? undefined
      : addressBook.addresses.find((a) => a._id === addressChoice);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    note: "",
  });
  const [delivery, setDelivery] = useState<ShippingAddressValue>({
    provinceCode: "",
    wardCode: "",
    addressLine: "",
  });
  const [payment, setPayment] = useState("COD");
  const [bankAvailable, setBankAvailable] = useState(false);
  useEffect(() => {
    request("/payments/options")
      .then((info) => setBankAvailable(info.bankTransferAvailable))
      .catch(() => setBankAvailable(false));
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState<TransferDetails | null>(null);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const subtotal = promotion.quote?.subtotal ?? cartSubtotal;
  const shipping = promotion.quote?.shippingFee ?? shippingFee(subtotal);
  const discount = promotion.quote?.discountTotal ?? 0;
  const total = promotion.quote?.total ?? subtotal + shipping;

  useEffect(() => {
    if (!token()) return;
    request("/auth/me")
      .then((user) =>
        setForm((current) => ({
          ...current,
          name: current.name || user.name || "",
          email: current.email || user.email || "",
          phone: current.phone || user.phone || "",
        })),
      )
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (orderId) return;
    let active = true;
    setCart(buyNow ? getBuyNow() : getCart());
    setCartReady(false);
    setCheckingCart(true);
    setError("");
    request("/products")
      .then((products) => {
        if (active) {
          setCart(
            buyNow
              ? reconcileItems(getBuyNow(), products)
              : reconcileCart(products),
          );
          setCartReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError("Không kiểm tra được giỏ hàng. Vui lòng tải lại trang.");
      })
      .finally(() => {
        if (active) setCheckingCart(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, buyNow]);
  useEffect(() => {
    if (!orderId || !token()) return;
    let active = true;
    setLoadingPayment(true);
    setQr(null);
    setError("");
    request(`/payments/create/${encodeURIComponent(orderId)}`, {
      method: "POST",
    })
      .then((info) => {
        if (active) setQr({ ...info, orderId });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoadingPayment(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (!token()) {
    return (
      <section className="lux-empty">
        <h2>Đăng nhập để tiếp tục thanh toán</h2>
        <Link
          className="gold-btn"
          to={`/login?next=${encodeURIComponent(orderId ? `/checkout?order=${encodeURIComponent(orderId)}` : buyNow ? BUY_NOW_CHECKOUT : "/checkout")}`}
        >
          Đăng nhập
        </Link>
      </section>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !cart.length ||
      submitting ||
      addressBook.loading ||
      checkingCart ||
      !cartReady ||
      promotion.loading ||
      !promotion.quote ||
      !cartHasStock(cart) ||
      !validSizes
    )
      return;
    const recipient = selectedAddress
      ? { ...form, name: selectedAddress.name, phone: selectedAddress.phone }
      : form;
    const destination = selectedAddress || delivery;
    if (!recipient.name.trim() || !recipient.phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại người nhận.");
      return;
    }
    if (
      !destination.provinceCode ||
      !destination.wardCode ||
      !destination.addressLine.trim()
    ) {
      setError("Vui lòng chọn tỉnh/thành, phường/xã và nhập địa chỉ cụ thể.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const order = await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId: selectedAddress?._id,
          customer: {
            ...recipient,
            provinceCode: destination.provinceCode,
            wardCode: destination.wardCode,
            addressLine: destination.addressLine,
          },
          items: cart.map((item) => ({
            product: item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            image: item.image,
            material: item.material,
            carat: item.carat,
            engraving: item.engraving,
          })),
          subtotal,
          shippingFee: shipping,
          total,
          paymentMethod: payment,
          voucherCode: promotion.quote?.voucher?.code,
          quotedTotal: promotion.quote.total,
        }),
      });
      if (buyNow) clearBuyNow();
      else saveCart([]);
      try {
        sessionStorage.removeItem("mira_voucher");
      } catch {
        /* Optional session persistence. */
      }
      if (payment === "BANK_QR") {
        setLoadingPayment(true);
        navigate(`/checkout?order=${encodeURIComponent(order._id)}`, {
          replace: true,
        });
        return;
      }
      notify("Đã đặt hàng thành công.");
      navigate("/account");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 409
      )
        promotion.refresh();
      setError(error instanceof Error ? error.message : "Không thể đặt hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPayment)
    return (
      <section className="lux-empty" role="status">
        Đang tải thông tin thanh toán...
      </section>
    );
  if (orderId && error)
    return (
      <section className="lux-empty">
        <p role="alert">{error}</p>
        <Link to="/account">Về tài khoản</Link>
      </section>
    );
  if (qr) return <PaymentTransfer key={qr.orderId} details={qr} />;

  if (!cart.length)
    return (
      <section className="lux-empty">
        <h2>{buyNow ? "Chưa có sản phẩm mua ngay" : "Giỏ hàng đang trống"}</h2>
        <Link to="/shop">Khám phá bộ sưu tập</Link>
      </section>
    );

  return (
    <main className="checkout-page-lux">
      <div className="checkout-progress">
        <b className="done">
          <Check size={13} /> GIỎ HÀNG
        </b>
        <i />
        <b className="active">02 THANH TOÁN</b>
        <i />
        <b>03 HOÀN TẤT</b>
      </div>
      <div className="checkout-heading">
        <span className="page-kicker">THANH TOÁN</span>
        <h1>Thông tin giao hàng</h1>
        <p>
          MIRA bảo mật thông tin và xác nhận đơn hàng riêng với từng thượng
          khách.
        </p>
      </div>
      <div className="checkout-grid-lux">
        <form className="checkout-form-lux" onSubmit={submit}>
          <h2>01. Thông tin người nhận</h2>
          {addressBook.loading && <p role="status">Đang tải địa chỉ đã lưu…</p>}
          {addressBook.error && (
            <div className="saved-address-error">
              <p>{addressBook.error} Bạn vẫn có thể nhập địa chỉ mới.</p>
              <button
                type="button"
                className="ui-secondary"
                onClick={addressBook.reload}
              >
                Tải lại địa chỉ
              </button>
            </div>
          )}
          {!!addressBook.addresses.length && (
            <div className="checkout-address-picker">
              <label>
                Địa chỉ giao hàng
                <select
                  aria-label="Chọn địa chỉ giao hàng"
                  value={selectedAddress?._id || "new"}
                  onChange={(e) => setAddressChoice(e.target.value)}
                >
                  <option value="new">Nhập địa chỉ mới</option>
                  {addressBook.addresses.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.label} · {a.name}
                      {a.isDefault ? " (Mặc định)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Link to="/account?tab=address" target="_blank" rel="noreferrer">
                Quản lý sổ địa chỉ
              </Link>
              <button type="button" onClick={addressBook.reload}>
                Cập nhật danh sách
              </button>
            </div>
          )}
          {selectedAddress ? (
            <div className="checkout-saved-address">
              <strong>
                {selectedAddress.name} · {selectedAddress.phone}
              </strong>
              <p>{selectedAddress.address}</p>
              <small>
                {selectedAddress.label}
                {selectedAddress.isDefault ? " · Địa chỉ mặc định" : ""}
              </small>
            </div>
          ) : (
            <>
              <div className="field-grid">
                <label>
                  Họ và tên
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nguyễn Hoàng Khánh"
                  />
                </label>
                <label>
                  Số điện thoại
                  <input
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="0908 xxx xxx"
                  />
                </label>
              </div>
              <ShippingAddressFields value={delivery} onChange={setDelivery} />
            </>
          )}
          <label>
            Email (không bắt buộc)
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </label>
          <label>
            Lời nhắn cho MIRA
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Thời gian nhận hàng mong muốn hoặc yêu cầu đặc biệt..."
            />
          </label>
          <h2>02. Phương thức thanh toán</h2>
          <div className="payment-options">
            <button
              type="button"
              className={payment === "COD" ? "active" : ""}
              aria-pressed={payment === "COD"}
              onClick={() => setPayment("COD")}
            >
              <Truck />
              <b>Thanh toán khi nhận</b>
              <span>Chuyên viên xác nhận trước khi giao</span>
            </button>
            <button
              type="button"
              className={payment === "BANK_QR" ? "active" : ""}
              aria-pressed={payment === "BANK_QR"}
              disabled={!bankAvailable || total <= 0}
              onClick={() => setPayment("BANK_QR")}
            >
              <CreditCard />
              <b>Chuyển khoản QR</b>
              <span>
                {bankAvailable
                  ? "QR tự hiện sau khi xác nhận đơn, có sẵn số tiền và nội dung"
                  : "Chưa sẵn sàng · Vui lòng chọn thanh toán khi nhận"}
              </span>
            </button>
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {!cartHasStock(cart) && (
            <p role="alert">
              Sản phẩm đã hết hàng hoặc vượt tồn kho.{" "}
              <Link to="/cart">Cập nhật giỏ hàng</Link>
            </p>
          )}
          {!validSizes && (
            <p className="pd-size-error" role="alert">
              Vui lòng chọn kích cỡ sản phẩm trước khi đặt hàng.{" "}
              <Link
                to={
                  buyNow
                    ? `/product/${cart[0]?.slug || cart[0]?._id}#purchase`
                    : "/cart"
                }
              >
                Chọn lại kích cỡ →
              </Link>
            </p>
          )}
          <button
            className="place-order"
            disabled={
              submitting ||
              addressBook.loading ||
              checkingCart ||
              !cartReady ||
              !cartHasStock(cart) ||
              !validSizes ||
              promotion.loading ||
              !promotion.quote
            }
          >
            {submitting ? "Đang xử lý…" : `XÁC NHẬN ĐƠN HÀNG · ${money(total)}`}
          </button>
          <p className="checkout-security">
            <LockKeyhole size={13} /> Thông tin thanh toán được mã hóa và bảo
            mật.
          </p>
        </form>
        <aside className="checkout-order-lux">
          <span className="page-kicker">SẢN PHẨM ĐÃ CHỌN</span>
          <h2>Đơn Hàng Của Bạn</h2>
          {cart.map((item, index) => (
            <div
              className="checkout-mini"
              key={`${item._id}-${item.size}-${item.engraving || ""}`}
            >
              <Image src={item.image} />
              <div>
                <b>{item.name}</b>
                <small>
                  {item.size ? `Kích cỡ ${item.size} · ` : ""}SL {item.quantity}
                </small>
              </div>
              <strong>
                {money(
                  (promotion.quote?.items[index]?.price ?? item.price) *
                    item.quantity,
                )}
              </strong>
            </div>
          ))}
          <hr />
          <VoucherField promotion={promotion} />
          <p>
            <span>Tạm tính</span>
            <b>{money(subtotal)}</b>
          </p>
          <p>
            <span>Vận chuyển</span>
            <b>{shipping ? money(shipping) : "Miễn phí"}</b>
          </p>
          {discount > 0 && (
            <p className="voucher-success">
              <span>Đã giảm bằng voucher</span>
              <b>−{money(discount)}</b>
            </p>
          )}
          <p className="checkout-total">
            <span>TỔNG</span>
            <b>{money(total)}</b>
          </p>
        </aside>
      </div>
    </main>
  );
}
