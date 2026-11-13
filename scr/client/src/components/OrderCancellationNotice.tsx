import { Link } from "react-router-dom";

export default function OrderCancellationNotice({
  paymentMethod,
  paymentStatus,
}: {
  paymentMethod?: string;
  paymentStatus?: string;
}) {
  return (
    <p>
      {paymentStatus === "REFUNDED"
        ? "Khoản thanh toán của đơn hàng đã được hoàn lại. "
        : paymentMethod === "BANK_QR"
          ? "Vui lòng chờ chúng tôi rà soát giao dịch và xử lý hoàn tiền nếu đã nhận được thanh toán. "
          : "Đơn hàng của bạn đã được hủy. "}
      Mọi chi tiết, vui lòng{" "}
      <Link className="order-cancellation-support" to="/advisor">
        liên hệ MIRA
      </Link>{" "}
      để được hỗ trợ.
    </p>
  );
}
