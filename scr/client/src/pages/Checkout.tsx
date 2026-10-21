import { shippingFee } from "../lib/commerce";
import Image from "../components/Image";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CreditCard, LockKeyhole, Truck } from "lucide-react";
import { getCart, saveCart, reconcileCart, cartHasStock } from "../store/cart";
import { request, token } from "../lib/api";

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

export default function Checkout() {
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const [loadingPayment, setLoadingPayment] = useState(Boolean(orderId));
  const [cart, setCart] = useState(getCart);
  const [checkingCart, setCheckingCart] = useState(!orderId);
  const [cartReady, setCartReady] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    note: "",
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
  const [qr, setQr] = useState<any>(null);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = shippingFee(subtotal);

  useEffect(() => {
    if (!token()) return;
    request("/auth/me")
      .then((user) =>
        setForm((current) => ({
          ...current,
          name: current.name || user.name || "",
          email: current.email || user.email || "",
          phone: current.phone || user.phone || "",
          address: current.address || user.address || "",
        })),
      )
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (orderId) return;
    let active = true;
    request("/products")
      .then((products) => {
        if (active) {
          setCart(reconcileCart(products));
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
  }, [orderId]);
  useEffect(() => {
    if (!orderId || !token()) return;
    let active = true;
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
          to={`/login?next=${encodeURIComponent(orderId ? `/checkout?order=${orderId}` : "/checkout")}`}
        >
          ĐĂNG NHẬP
        </Link>
      </section>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !cart.length ||
      submitting ||
      checkingCart ||
      !cartReady ||
      !cartHasStock(cart)
    )
      return;
    setSubmitting(true);
    setError("");
    try {
      const order = await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          customer: form,
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
          total: subtotal + shipping,
          paymentMethod: payment,
        }),
      });
      saveCart([]);
      if (payment === "BANK_QR") {
        setQr({
          amount: order.total,
          transferContent: order.orderCode,
          payment: { orderCode: order.orderCode },
        });
        const info = await request(`/payments/create/${order._id}`, {
          method: "POST",
        });
        setQr({ ...info, orderId: order._id });
        return;
      }
      navigate("/account");
    } catch (error) {
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
  if (qr)
    return (
      <main className="smart-page">
        <header>
          <span>PAYMENT RECONCILIATION</span>
          <h1>Thanh toán đơn {qr.payment?.orderCode}</h1>
          <p>
            Chuyển đúng số tiền và nội dung. Hệ thống sẽ xác nhận qua webhook
            của nhà cung cấp thanh toán.
          </p>
        </header>
        <section className="smart-result">
          {error && <p role="alert">Đơn đã được tạo. {error}</p>}
          {qr.qrUrl && (
            <Image
              src={qr.qrUrl}
              style={{ maxWidth: 320, display: "block", margin: "auto" }}
            />
          )}
          <h2>{money(qr.amount)}</h2>
          <p>
            Ngân hàng:{" "}
            <b>
              {qr.bankName ||
                "Vui lòng liên hệ MIRA để nhận thông tin thanh toán"}
            </b>
          </p>
          <p>
            Số tài khoản:{" "}
            <b>
              {qr.accountNo ||
                "Vui lòng liên hệ MIRA để nhận thông tin thanh toán"}
            </b>
          </p>
          <p>
            Nội dung: <b>{qr.transferContent}</b>
          </p>
          <button className="place-order" onClick={() => navigate("/account")}>
            XEM TRẠNG THÁI ĐƠN
          </button>
        </section>
      </main>
    );

  if (!cart.length)
    return (
      <section className="lux-empty">
        <h2>Giỏ hàng đang trống</h2>
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
        <span className="page-kicker">SECURE CHECKOUT</span>
        <h1>Thông Tin Bàn Giao</h1>
        <p>
          MIRA bảo mật thông tin và xác nhận đơn hàng riêng với từng thượng
          khách.
        </p>
      </div>
      <div className="checkout-grid-lux">
        <form className="checkout-form-lux" onSubmit={submit}>
          <h2>01. Thông tin người nhận</h2>
          <div className="field-grid">
            <label>
              HỌ VÀ TÊN
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nguyễn Hoàng Khánh"
              />
            </label>
            <label>
              SỐ ĐIỆN THOẠI
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0908 xxx xxx"
              />
            </label>
          </div>
          <label>
            EMAIL
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </label>
          <label>
            ĐỊA CHỈ BÀN GIAO
            <textarea
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            />
          </label>
          <label>
            LỜI NHẮN CHO MIRA
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
              onClick={() => setPayment("COD")}
            >
              <Truck />
              <b>Thanh toán khi nhận</b>
              <span>Chuyên viên xác nhận trước khi giao</span>
            </button>
            <button
              type="button"
              className={payment === "BANK_QR" ? "active" : ""}
              disabled={!bankAvailable}
              onClick={() => setPayment("BANK_QR")}
            >
              <CreditCard />
              <b>Chuyển khoản ngân hàng</b>
              <span>
                {bankAvailable
                  ? "Chuyển đúng mã đơn và số tiền"
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
          <button
            className="place-order"
            disabled={
              submitting || checkingCart || !cartReady || !cartHasStock(cart)
            }
          >
            {submitting
              ? "ĐANG XỬ LÝ..."
              : `XÁC NHẬN ĐƠN HÀNG · ${money(subtotal + shipping)}`}
          </button>
          <p className="checkout-security">
            <LockKeyhole size={13} /> Thông tin thanh toán được mã hóa và bảo
            mật.
          </p>
        </form>
        <aside className="checkout-order-lux">
          <span className="page-kicker">YOUR SELECTION</span>
          <h2>Đơn Hàng Của Bạn</h2>
          {cart.map((item) => (
            <div
              className="checkout-mini"
              key={`${item._id}-${item.size}-${item.engraving || ""}`}
            >
              <Image src={item.image} />
              <div>
                <b>{item.name}</b>
                <small>
                  Size {item.size} · SL {item.quantity}
                </small>
              </div>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          ))}
          <hr />
          <p>
            <span>Tạm tính</span>
            <b>{money(subtotal)}</b>
          </p>
          <p>
            <span>Vận chuyển</span>
            <b>{shipping ? money(shipping) : "Miễn phí"}</b>
          </p>
          <p className="checkout-total">
            <span>TỔNG</span>
            <b>{money(subtotal + shipping)}</b>
          </p>
        </aside>
      </div>
    </main>
  );
}
