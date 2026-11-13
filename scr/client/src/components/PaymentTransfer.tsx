import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
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
  const navigate = useNavigate();
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [imageRevision, setImageRevision] = useState(0);
  const status = details.payment?.status || "PENDING";
  const paid = status === "PAID";
  const needsReview = status === "MISMATCH";
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
  function confirmTransfer() {
    navigate(
      `/account?tab=orders&order=${encodeURIComponent(details.orderId)}`,
      {
        state: { transferSubmitted: details.orderId },
      },
    );
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
        <h1>{paid ? "Thanh toán thành công" : "Hoàn tất thanh toán"}</h1>
        <p>
          Đơn hàng <strong>{code}</strong>
          {!paid && " · Quét QR hoặc chuyển khoản theo thông tin bên dưới."}
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
              : status === "MISMATCH"
                ? "Cần đối soát giao dịch"
                : "Chờ thanh toán"}
          </span>
          {paid ? (
            <div className="transfer-complete">
              <CheckCircle2 size={64} />
              <h2>MIRA đã nhận thanh toán</h2>
              <p>
                Bạn có thể theo dõi tiến độ chuẩn bị và giao hàng trong tài
                khoản.
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
          {!paid && !needsReview && (
            <p className="transfer-note">
              Vui lòng chuyển đúng số tiền và nội dung. Sau khi chuyển khoản
              thành công trên ứng dụng ngân hàng, chọn “Tôi đã chuyển khoản” để
              mở chi tiết đơn hàng và theo dõi xác nhận thanh toán.
            </p>
          )}
          {status === "MISMATCH" && (
            <p className="form-error" role="alert">
              Thông tin giao dịch cần được đối soát. Vui lòng liên hệ MIRA trước
              khi chuyển thêm tiền.
            </p>
          )}
          <div className="transfer-actions">
            {!paid && !needsReview && (
              <button
                type="button"
                className="ui-primary"
                onClick={confirmTransfer}
              >
                <CheckCircle2 size={16} /> Tôi đã chuyển khoản
              </button>
            )}
            <Link
              className="ui-secondary"
              to={`/account?tab=orders&order=${encodeURIComponent(details.orderId)}`}
            >
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
