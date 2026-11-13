import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { request } from "../lib/api";
import { notify } from "../lib/notifications";

export type TransferDetails = {
  orderId: string;
  payment?: { orderCode?: string; status?: string };
  qrUrl?: string;
  transferContent: string;
  amount: number;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
};
const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

export default function PaymentTransfer({
  details,
}: {
  details: TransferDetails;
}) {
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [imageRevision, setImageRevision] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(details.payment?.status || "PENDING");
  const [cancelled, setCancelled] = useState(false);
  const paid = status === "PAID";
  const code = details.payment?.orderCode || details.transferContent;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify("Đã sao chép thông tin chuyển khoản.");
    } catch {
      notify(
        "Chưa sao chép được. Bạn có thể chọn và sao chép thông tin bên dưới.",
        "info",
      );
    }
  }
  async function refresh() {
    if (checking) return;
    setChecking(true);
    setError("");
    try {
      const result = await request(
        `/payments/order/${encodeURIComponent(details.orderId)}`,
      );
      setStatus(result.paymentStatus);
      setCancelled(result.status === "cancelled");
      notify(
        result.paymentStatus === "PAID"
          ? "Đã xác nhận thanh toán đơn hàng."
          : "Đã cập nhật trạng thái đơn hàng.",
        result.paymentStatus === "PAID" ? "success" : "info",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Chưa kiểm tra được thanh toán. Vui lòng thử lại.",
      );
    } finally {
      setChecking(false);
    }
  }
  const fields: [string, string | undefined][] = [
    ["Ngân hàng", details.bankName],
    ["Số tài khoản", details.accountNo],
    ["Chủ tài khoản", details.accountName],
    ["Nội dung chuyển khoản", details.transferContent],
  ];
  return (
    <main className="transfer-page">
      <Link className="back-link" to="/account">
        <ArrowLeft size={16} /> Tài khoản và đơn hàng
      </Link>
      <div className="transfer-heading">
        <span className="page-kicker">MIRA SECURE PAYMENT</span>
        <h1>
          {paid
            ? "Thanh toán thành công"
            : cancelled
              ? "Đơn hàng đã hủy"
              : "Hoàn tất thanh toán"}
        </h1>
        <p>
          Đơn hàng <strong>{code}</strong>
          {!paid &&
            !cancelled &&
            " · Quét QR hoặc chuyển khoản theo thông tin bên dưới."}
        </p>
      </div>
      <section className="transfer-card" aria-label="Thông tin chuyển khoản">
        <div className="transfer-qr-panel">
          <span
            className={`payment-status ${paid ? "paid" : ""}`}
            role="status"
          >
            {paid ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
            {paid
              ? "Đã thanh toán"
              : cancelled
                ? "Đã hủy"
                : status === "MISMATCH"
                  ? "Cần đối soát giao dịch"
                  : "Chờ thanh toán"}
          </span>
          {paid || cancelled ? (
            <div className="transfer-complete">
              <CheckCircle2 size={64} />
              <h2>
                {paid
                  ? "MIRA đã nhận thanh toán"
                  : "Đơn hàng không còn chờ thanh toán"}
              </h2>
              <p>
                {paid
                  ? "Bạn có thể theo dõi tiến độ chuẩn bị và giao hàng trong tài khoản."
                  : "Vui lòng không chuyển khoản cho đơn hàng này."}
              </p>
            </div>
          ) : (
            <>
              <div
                className="transfer-qr-frame"
                aria-busy={!!details.qrUrl && imageState === "loading"}
              >
                {details.qrUrl && imageState !== "error" && (
                  <img
                    key={imageRevision}
                    src={details.qrUrl}
                    alt={`Mã QR thanh toán đơn ${code}`}
                    onLoad={() => setImageState("ready")}
                    onError={() => setImageState("error")}
                  />
                )}
                {(!details.qrUrl || imageState === "error") && (
                  <div className="qr-image-error" role="status">
                    <QrCode size={40} />
                    <b>Chưa tải được mã QR</b>
                    <p>Bạn vẫn có thể chuyển khoản theo thông tin bên cạnh.</p>
                    {details.qrUrl && (
                      <button
                        type="button"
                        className="ui-secondary"
                        onClick={() => {
                          setImageState("loading");
                          setImageRevision((v) => v + 1);
                        }}
                      >
                        <RefreshCw size={15} /> Tải lại mã QR
                      </button>
                    )}
                  </div>
                )}
                {details.qrUrl && imageState === "loading" && (
                  <span className="qr-loading" role="status">
                    Đang tải mã QR…
                  </span>
                )}
              </div>
              <p className="transfer-scan-hint">
                <QrCode size={18} /> Mở ứng dụng ngân hàng để quét mã
              </p>
            </>
          )}
          <span className="transfer-security">
            <ShieldCheck size={16} /> Thanh toán trực tiếp tới tài khoản MIRA
          </span>
        </div>
        <div className="transfer-details">
          <span className="page-kicker">THÔNG TIN GIAO DỊCH</span>
          <div className="transfer-amount">
            <span>Số tiền thanh toán</span>
            <strong>{money(details.amount)}</strong>
          </div>
          <dl className="transfer-fields">
            {fields.map(([label, value]) => (
              <div key={label}>
                <div>
                  <dt>{label}</dt>
                  <dd>{value || "Vui lòng liên hệ MIRA để được hỗ trợ"}</dd>
                </div>
                {value && (
                  <button
                    type="button"
                    className="copy-button"
                    aria-label={`Sao chép ${label.toLowerCase()}`}
                    onClick={() => void copy(value)}
                  >
                    <Copy size={17} />
                  </button>
                )}
              </div>
            ))}
          </dl>
          {!paid && !cancelled && (
            <p className="transfer-note">
              Vui lòng giữ nguyên số tiền và nội dung chuyển khoản để MIRA đối
              chiếu đúng đơn hàng. Trạng thái được cập nhật sau khi giao dịch
              được xác nhận.
            </p>
          )}
          {status === "MISMATCH" && (
            <p className="form-error" role="alert">
              Thông tin giao dịch cần được đối soát. Vui lòng liên hệ MIRA trước
              khi chuyển thêm tiền.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="transfer-actions">
            {!paid && !cancelled && (
              <button
                type="button"
                className="ui-primary"
                disabled={checking}
                onClick={() => void refresh()}
              >
                <RefreshCw
                  size={16}
                  className={checking ? "is-spinning" : ""}
                />{" "}
                {checking ? "Đang kiểm tra…" : "Kiểm tra thanh toán"}
              </button>
            )}
            <Link className="ui-secondary" to="/account">
              Xem đơn hàng của tôi
            </Link>
          </div>
        </div>
      </section>
      <p className="transfer-support">
        Cần hỗ trợ? <Link to="/advisor">Liên hệ tư vấn MIRA</Link>
      </p>
    </main>
  );
}
