import { CalendarCheck, Check, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppointmentConfirmation } from "../controllers/useAppointmentController";
import {
  emailStatusText,
  formatAppointmentDate,
} from "../models/appointment.model";

export default function AppointmentConfirmation() {
  const { appointment, loading, sending, error, resend } =
    useAppointmentConfirmation();
  if (loading)
    return (
      <main className="appointment-page appointment-empty" aria-busy="true">
        <p role="status">Đang tải lịch hẹn…</p>
      </main>
    );
  if (!appointment)
    return (
      <main className="appointment-page appointment-empty">
        <h1>Thông tin lịch hẹn</h1>
        <p role="alert">{error}</p>
        <Link className="gold-btn" to="/appointments">
          ĐẶT LỊCH TƯ VẤN
        </Link>
      </main>
    );
  return (
    <main className="appointment-page appointment-confirmation">
      <div className="appointment-success-icon">
        <Check size={32} />
      </div>
      <span className="page-kicker">MIRA PRIVATE SALON</span>
      <h1>Đặt lịch hẹn thành công</h1>
      <p>Cảm ơn {appointment.name}. MIRA rất mong được đón tiếp bạn.</p>
      <section className="appointment-ticket" aria-label="Chi tiết lịch hẹn">
        <div className="appointment-ticket-head">
          <CalendarCheck size={27} />
          <div>
            <span>MÃ LỊCH HẸN</span>
            <strong>{appointment.code}</strong>
          </div>
          <span className="appointment-booked">Đã đặt lịch</span>
        </div>
        <dl className="appointment-details">
          <div>
            <dt>Salon</dt>
            <dd>{appointment.salonName}</dd>
          </div>
          <div>
            <dt>Thời gian tư vấn</dt>
            <dd>
              {appointment.time} · {formatAppointmentDate(appointment.date)}
              <small>Giờ Việt Nam (UTC+7)</small>
            </dd>
          </div>
          <div>
            <dt>Họ và tên</dt>
            <dd>{appointment.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{appointment.email}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{appointment.phone}</dd>
          </div>
          <div>
            <dt>Nhu cầu tư vấn</dt>
            <dd>{appointment.interest}</dd>
          </div>
          <div>
            <dt>Ngân sách dự kiến</dt>
            <dd>{appointment.budget}</dd>
          </div>
          <div>
            <dt>Lời nhắn</dt>
            <dd className="appointment-notes">
              {appointment.notes || "Không có"}
            </dd>
          </div>
        </dl>
        <div
          className={`appointment-email appointment-email-${appointment.emailStatus}`}
          role="status"
        >
          <Mail size={20} />
          <p>{emailStatusText(appointment)}</p>
        </div>
        {appointment.emailStatus !== "sent" && (
          <button
            className="appointment-resend"
            onClick={resend}
            disabled={sending}
          >
            {sending ? "Đang gửi…" : "Gửi lại email xác nhận"}
          </button>
        )}
        {error && (
          <p className="appointment-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <p className="appointment-hint">
        Vui lòng lưu mã hẹn để cung cấp khi đến Salon.
      </p>
      <div className="appointment-actions">
        <Link className="gold-btn" to="/products">
          KHÁM PHÁ TRANG SỨC
        </Link>
        <Link to="/">Trở về trang chủ</Link>
      </div>
    </main>
  );
}
