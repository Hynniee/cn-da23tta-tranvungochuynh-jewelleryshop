import { CalendarDays, Clock3, Gem, Mail, MapPin } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppointmentController } from "../controllers/useAppointmentController";
import { appointmentConfig as config } from "../models/appointment.model";

export default function Appointment() {
  const {
    form,
    update,
    submit,
    loading,
    error,
    dateInput,
    dateError,
    updateDate,
    validateDate,
    emailError,
    updateEmail,
    validateEmail,
  } = useAppointmentController();
  const { key } = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    formRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    nameRef.current?.focus({ preventScroll: true });
  }, [key]);
  return (
    <main className="appointment-page">
      <div className="appointment-intro">
        <span className="page-kicker">MIRA PRIVATE SALON</span>
        <h1>
          Hẹn một khoảnh khắc
          <br />
          <em>dành riêng cho bạn.</em>
        </h1>
        <p>
          Trải nghiệm trang sức MIRA trong không gian riêng tư. Chia sẻ mong
          muốn để chuyên viên chuẩn bị cho buổi gặp của bạn.
        </p>
      </div>
      <div className="appointment-layout">
        <aside className="appointment-aside">
          <Gem size={32} strokeWidth={1} />
          <h2>
            Mỗi lựa chọn,
            <br />
            một câu chuyện riêng.
          </h2>
          <p>
            Từ một món quà ý nghĩa đến dấu mốc trọn đời, MIRA cùng bạn tìm thiết
            kế phù hợp.
          </p>
          <ul>
            <li>
              <MapPin size={18} /> TP. Hồ Chí Minh & Hà Nội
            </li>
            <li>
              <Clock3 size={18} /> Chọn khung giờ phù hợp với bạn
            </li>
            <li>
              <Mail size={18} /> Nhận mã hẹn và thông tin qua email
            </li>
          </ul>
          <p className="appointment-aside-note">
            Tất cả thời gian hiển thị theo giờ Việt Nam (UTC+7). Vui lòng kiểm
            tra email và số điện thoại trước khi đặt lịch.
          </p>
          <Link to="/advisor">Tham khảo MIRA AI trước buổi hẹn →</Link>
        </aside>
        <form ref={formRef} className="appointment-card" onSubmit={submit}>
          <span className="page-kicker">01 / THÔNG TIN CỦA BẠN</span>
          <h2>Đặt lịch tư vấn riêng</h2>
          <p className="appointment-hint">
            Các trường có dấu * là bắt buộc. Bạn có thể đặt lịch mà không cần
            đăng nhập.
          </p>
          <div className="appointment-fields">
            <label className="appointment-wide">
              Họ và tên *
              <input
                ref={nameRef}
                autoComplete="name"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Nhập họ và tên"
              />
            </label>
            <label>
              Email *
              <input
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                value={form.email}
                aria-label="Email"
                aria-invalid={Boolean(emailError)}
                aria-describedby={
                  emailError ? "appointment-email-error" : undefined
                }
                onChange={(e) =>
                  e.currentTarget.setCustomValidity(updateEmail(e.target.value))
                }
                onBlur={(e) =>
                  e.currentTarget.setCustomValidity(validateEmail())
                }
                onInvalid={validateEmail}
                placeholder="ban@email.com"
              />
              {emailError && (
                <span
                  id="appointment-email-error"
                  className="appointment-field-error"
                  role="alert"
                >
                  {emailError}
                </span>
              )}
            </label>
            <label>
              Số điện thoại *
              <input
                type="tel"
                autoComplete="tel"
                required
                maxLength={20}
                pattern="[+0-9 ().-]{10,20}"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="090 123 4567"
              />
            </label>
          </div>
          <span className="page-kicker appointment-step">
            02 / BUỔI HẸN CỦA BẠN
          </span>
          <div className="appointment-fields">
            <label className="appointment-wide">
              Salon *
              <select
                required
                value={form.salonId}
                onChange={(e) => update("salonId", e.target.value)}
              >
                <option value="">Chọn Salon bạn muốn đến</option>
                {config.salons.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ngày tư vấn *
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="dd/mm/yyyy"
                aria-label="Ngày tư vấn"
                aria-describedby={
                  dateError ? "appointment-date-error" : "appointment-date-hint"
                }
                aria-invalid={Boolean(dateError)}
                value={dateInput}
                onChange={(e) =>
                  e.currentTarget.setCustomValidity(updateDate(e.target.value))
                }
                onBlur={(e) =>
                  e.currentTarget.setCustomValidity(validateDate())
                }
                onInvalid={validateDate}
              />
              {dateError ? (
                <span
                  id="appointment-date-error"
                  className="appointment-field-error"
                  role="alert"
                >
                  {dateError}
                </span>
              ) : (
                <span
                  id="appointment-date-hint"
                  className="appointment-field-hint"
                >
                  Ngày/tháng/năm · Từ hôm nay, giờ Việt Nam
                </span>
              )}
            </label>
            <label>
              Khung giờ *
              <select
                required
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
              >
                <option value="">Chọn giờ (UTC+7)</option>
                {config.times.map((time) => (
                  <option
                    key={time}
                    value={time}
                    disabled={
                      !form.date ||
                      new Date(
                        `${form.date}T${time}:00${config.utcOffset}`,
                      ).getTime() <= Date.now()
                    }
                  >
                    {time}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nhu cầu tư vấn
              <select
                value={form.interest}
                onChange={(e) => update("interest", e.target.value)}
              >
                {config.interests.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Ngân sách dự kiến
              <select
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              >
                {config.budgets.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="appointment-wide">
              Lời nhắn cho chuyên viên
              <textarea
                rows={4}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Phong cách yêu thích, dịp đặc biệt hoặc thiết kế bạn muốn thử…"
              />
              <small>{form.notes.length}/1000 ký tự</small>
            </label>
          </div>
          {error && (
            <p className="appointment-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="appointment-submit"
            type="submit"
            disabled={loading}
          >
            <CalendarDays size={17} />
            {loading ? "ĐANG ĐẶT LỊCH…" : "XÁC NHẬN ĐẶT LỊCH"}
          </button>
          <p className="appointment-hint">
            MIRA sử dụng thông tin bạn cung cấp để chuẩn bị buổi tư vấn và gửi
            email xác nhận lịch hẹn.
          </p>
        </form>
      </div>
    </main>
  );
}
