import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Clock3,
  Heart,
  Package,
  Truck,
} from "lucide-react";
import type { CustomerOrder } from "../components/OrderDetailsDialog";
import useOrderPayment, { PaymentUpdate } from "../controllers/useOrderPayment";
import { request, token } from "../lib/api";
import OrderCancellationNotice from "../components/OrderCancellationNotice";

export default function ThankYou() {
  const [params] = useSearchParams();
  const id = params.get("order");
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const update = useCallback((orderId: string, result: PaymentUpdate) => {
    setOrder((current) =>
      current?._id === orderId ? { ...current, ...result } : current,
    );
  }, []);
  const payment = useOrderPayment(order, update);
  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setError("");
    setLoading(true);
    if (!id || !token()) {
      setLoading(false);
      return;
    }
    request(`/orders/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setOrder(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, revision]);
  if (!token())
    return (
      <section className="lux-empty">
        <h1>Đăng nhập để xem đơn hàng</h1>
        <Link
          className="ui-primary"
          to={`/login?next=${encodeURIComponent(`/thank-you?order=${id || ""}`)}`}
        >
          Đăng nhập
        </Link>
      </section>
    );
  if (loading)
    return (
      <section className="lux-empty" role="status">
        Đang tải đơn hàng…
      </section>
    );
  if (!order)
    return (
      <section className="lux-empty">
        <h1>Chưa xem được đơn hàng</h1>
        <p role="alert">{error || "Không tìm thấy mã đơn hàng"}</p>
        {id && (
          <button
            className="ui-secondary"
            onClick={() => setRevision((v) => v + 1)}
          >
            Thử lại
          </button>
        )}
        <Link className="ui-primary" to="/account?tab=orders">
          Đơn hàng của tôi
        </Link>
      </section>
    );
  const paid = order.paymentStatus === "PAID";
  const cancelled = order.status === "cancelled";
  const mismatch = order.paymentStatus === "MISMATCH";
  const refunded = order.paymentStatus === "REFUNDED";
  const code = order.orderCode || `#${order._id.slice(-8).toUpperCase()}`;
  return (
    <main className="thankyou-page">
      <section className="thankyou-hero">
        <span className="thankyou-icon">
          <Heart size={34} strokeWidth={1.4} />
        </span>
        <span className="page-kicker">MIRA · WITH LOVE</span>
        <h1>Cảm ơn bạn đã chọn MIRA</h1>
        <p>
          Mỗi món trang sức đều mang một câu chuyện
          <br />
          MIRA rất vui được trở thành một phần trong câu chuyện của bạn
        </p>
        <div className="thankyou-order-code">
          Đơn hàng <strong>{code}</strong>
        </div>
      </section>
      <section className="thankyou-card" aria-label="Thông tin đơn hàng">
        <div
          className={`thankyou-payment ${paid && !cancelled ? "paid" : ""}`}
          role="status"
        >
          {paid && !cancelled ? (
            <CheckCircle2 size={25} />
          ) : (
            <Clock3 size={25} />
          )}
          <div>
            <h2>
              {cancelled
                ? "Đơn hàng đã hủy"
                : refunded
                  ? "Đã hoàn tiền"
                  : mismatch
                    ? "Giao dịch cần đối soát"
                    : paid
                      ? "Đã xác nhận thanh toán"
                      : order.paymentMethod === "BANK_QR"
                        ? "Đang chờ xác nhận thanh toán"
                        : "Đã tiếp nhận đơn hàng"}
            </h2>
            {cancelled ? (
              <OrderCancellationNotice
                paymentMethod={order.paymentMethod}
                paymentStatus={order.paymentStatus}
              />
            ) : (
              <p>
                {refunded
                  ? "Khoản thanh toán của đơn hàng đã được hoàn lại"
                  : mismatch
                    ? "Vui lòng liên hệ MIRA để đối soát. Không chuyển thêm tiền trước khi được hỗ trợ"
                    : paid
                      ? "MIRA đã nhận thanh toán. Bạn có thể theo dõi tiến độ xử lý trong chi tiết đơn hàng"
                      : order.paymentMethod === "BANK_QR"
                        ? "Nếu đã chuyển khoản thành công, bạn không cần chuyển lại. Trạng thái sẽ tự cập nhật khi MIRA xác nhận giao dịch"
                        : "MIRA sẽ liên hệ xác nhận trước khi giao hàng. Bạn thanh toán khi nhận sản phẩm"}
              </p>
            )}
          </div>
        </div>
        {payment.error && (
          <div role="alert" className="form-error">
            <p>{payment.error}</p>
            <button className="ui-secondary" onClick={payment.retry}>
              Thử lại kết nối
            </button>
          </div>
        )}
        {!cancelled && !refunded && (
          <ol className="thankyou-steps" aria-label="Tiến trình đơn hàng">
            <li className="done">
              <span>
                <Check size={18} />
              </span>
              <b>Đã đặt hàng</b>
            </li>
            <li
              className={
                ["confirmed", "shipping", "delivered", "completed"].includes(
                  order.status,
                )
                  ? "done"
                  : "current"
              }
            >
              <span>
                <Package size={18} />
              </span>
              <b>Xác nhận & chuẩn bị</b>
            </li>
            <li
              className={
                ["shipping", "delivered", "completed"].includes(order.status)
                  ? "done"
                  : ""
              }
            >
              <span>
                <Truck size={18} />
              </span>
              <b>Giao đến bạn</b>
            </li>
          </ol>
        )}
        <div className="thankyou-summary">
          <div>
            <span>NGƯỜI NHẬN</span>
            <strong>{order.customer?.name}</strong>
            <p>{order.customer?.phone}</p>
            <p>{order.customer?.address}</p>
          </div>
          <div>
            <span>TỔNG ĐƠN HÀNG</span>
            <strong className="thankyou-total">
              {order.total.toLocaleString("vi-VN")} ₫
            </strong>
            <p>
              {order.paymentMethod === "BANK_QR"
                ? "Chuyển khoản ngân hàng"
                : "Thanh toán khi nhận hàng"}
            </p>
          </div>
        </div>
        <div className="thankyou-actions">
          <Link
            className="ui-primary"
            to={`/account?tab=orders&order=${encodeURIComponent(order._id)}`}
          >
            Xem chi tiết đơn hàng
          </Link>
          <Link className="ui-secondary" to="/products">
            Tiếp tục mua sắm
          </Link>
        </div>
      </section>
      <p className="thankyou-signature">
        Được chọn bởi bạn. Được trân trọng bởi MIRA
      </p>
      <p className="transfer-support">
        Cần hỗ trợ?{" "}
        <Link
          to={
            order?._id
              ? `/support?order=${encodeURIComponent(order._id)}`
              : "/support"
          }
        >
          Liên hệ nhân viên MIRA
        </Link>
      </p>
    </main>
  );
}
