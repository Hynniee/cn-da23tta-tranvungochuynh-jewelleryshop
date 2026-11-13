import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, X } from "lucide-react";
import useOrderPayment, { PaymentUpdate } from "../controllers/useOrderPayment";
import { orderLabels } from "../lib/commerce";
import OrderCancellationNotice from "./OrderCancellationNotice";

export type CustomerOrder = {
  _id: string;
  orderCode?: string;
  createdAt: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  total: number;
  subtotal?: number;
  shippingFee?: number;
  discountTotal?: number;
  items?: {
    name: string;
    price: number;
    quantity: number;
    image?: string;
    size?: string;
    material?: string;
    engraving?: string;
  }[];
  customer?: { name?: string; phone?: string; address?: string; note?: string };
};
const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

export default function OrderDetailsDialog({
  order,
  transferSubmitted,
  onClose,
  onPaymentUpdate,
}: {
  order: CustomerOrder;
  transferSubmitted: boolean;
  onClose: () => void;
  onPaymentUpdate: (id: string, update: PaymentUpdate) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { waiting, error, retry } = useOrderPayment(order, onPaymentUpdate);
  const paid = order.paymentStatus === "PAID";
  const cancelled = order.status === "cancelled";
  const needsReview = order.paymentStatus === "MISMATCH";
  const code = order.orderCode || `#${order._id.slice(-8).toUpperCase()}`;

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  const paymentLabel = cancelled
    ? "Đơn hàng đã hủy"
    : paid
      ? "Đã thanh toán"
      : needsReview
        ? "Cần đối soát giao dịch"
        : order.paymentStatus === "REFUNDED"
          ? "Đã hoàn tiền"
          : waiting
            ? "Đang chờ xác nhận thanh toán"
            : "Chưa thanh toán";

  return (
    <dialog
      ref={dialog}
      className="order-details-dialog"
      aria-labelledby="order-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className="order-dialog-heading">
        <div>
          <span className="page-kicker">ĐƠN HÀNG CỦA TÔI</span>
          <h2 id="order-dialog-title">Chi tiết đơn hàng</h2>
          <p>
            {code} · {new Date(order.createdAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
        <button
          type="button"
          className="order-dialog-close"
          aria-label="Đóng chi tiết đơn hàng"
          autoFocus
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div
        className={`order-payment-state ${paid && !cancelled ? "paid" : ""}`}
        role="status"
      >
        {paid && !cancelled ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
        <div>
          <strong>{paymentLabel}</strong>
          {waiting && (
            <p>
              {transferSubmitted
                ? "Nếu bạn đã chuyển khoản thành công, vui lòng không chuyển lại. Trạng thái sẽ tự cập nhật khi MIRA xác nhận giao dịch."
                : "Trạng thái sẽ tự cập nhật khi MIRA xác nhận giao dịch."}
            </p>
          )}
          {needsReview && !cancelled && (
            <p>Vui lòng liên hệ MIRA để đối soát trước khi chuyển thêm tiền.</p>
          )}
          {cancelled && (
            <OrderCancellationNotice
              paymentMethod={order.paymentMethod}
              paymentStatus={order.paymentStatus}
            />
          )}
        </div>
      </div>
      {error && waiting && (
        <div className="form-error" role="alert">
          {error}
          <button type="button" className="ui-secondary" onClick={retry}>
            Thử lại kết nối
          </button>
        </div>
      )}
      <dl className="order-dialog-meta">
        <div>
          <dt>Trạng thái đơn hàng</dt>
          <dd>{orderLabels[order.status] || order.status}</dd>
        </div>
        <div>
          <dt>Phương thức thanh toán</dt>
          <dd>
            {order.paymentMethod === "BANK_QR"
              ? "Chuyển khoản ngân hàng"
              : "Thanh toán khi nhận hàng"}
          </dd>
        </div>
      </dl>
      <section
        className="order-dialog-items"
        aria-label="Sản phẩm trong đơn hàng"
      >
        {(order.items || []).map((item, index) => (
          <article key={index}>
            {item.image && <img src={item.image} alt={item.name} />}
            <div>
              <strong>{item.name}</strong>
              <p>
                {[item.material, item.size && `Kích cỡ: ${item.size}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.engraving && <p>Khắc chữ: {item.engraving}</p>}
              <span>
                {item.quantity} × {money(item.price)}
              </span>
            </div>
            <b>{money(item.price * item.quantity)}</b>
          </article>
        ))}
      </section>
      {order.customer && (
        <section className="order-dialog-delivery">
          <h3>Thông tin giao hàng</h3>
          <p>
            {order.customer.name} · {order.customer.phone}
          </p>
          <p>{order.customer.address}</p>
          {order.customer.note && <p>Ghi chú: {order.customer.note}</p>}
        </section>
      )}
      <dl className="order-dialog-totals">
        {order.subtotal != null && (
          <div>
            <dt>Tạm tính</dt>
            <dd>{money(order.subtotal)}</dd>
          </div>
        )}
        {order.shippingFee != null && (
          <div>
            <dt>Phí giao hàng</dt>
            <dd>{money(order.shippingFee)}</dd>
          </div>
        )}
        {!!order.discountTotal && (
          <div>
            <dt>Giảm giá</dt>
            <dd>−{money(order.discountTotal)}</dd>
          </div>
        )}
        <div className="order-dialog-total">
          <dt>Tổng thanh toán</dt>
          <dd>{money(order.total)}</dd>
        </div>
      </dl>
      <div className="order-dialog-actions">
        <Link className="ui-secondary" to="/advisor">
          Liên hệ hỗ trợ
        </Link>
        <button type="button" className="ui-primary" onClick={onClose}>
          Đóng chi tiết
        </button>
      </div>
    </dialog>
  );
}
