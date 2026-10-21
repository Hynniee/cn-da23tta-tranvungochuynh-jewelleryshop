import config from "../../../server/src/data/appointmentConfig.json";

export const appointmentConfig = config;
const emailPattern = new RegExp(config.emailPattern);

export function appointmentEmailInputError(value: string) {
  const email = value.trim();
  if (!email) return "Vui lòng nhập email.";
  if (
    email.length > 254 ||
    email.split("@")[0].length > 64 ||
    !emailPattern.test(email)
  )
    return "Email chưa đúng định dạng. Ví dụ: ten@gmail.com.";
  return "";
}
export type AppointmentForm = {
  name: string;
  email: string;
  phone: string;
  salonId: string;
  date: string;
  time: string;
  interest: string;
  budget: string;
  notes: string;
};
export type Appointment = AppointmentForm & {
  code: string;
  salonName: string;
  startsAt: string;
  timeZone: string;
  status: "booked";
  emailStatus: "pending" | "sent" | "failed" | "not_configured";
};

export function appointmentDate(offsetDays = 0) {
  return new Date(Date.now() + 7 * 3600000 + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}
export const formatAppointmentDate = (date: string) =>
  date.split("-").reverse().join("/");

export function formatAppointmentDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    .filter(Boolean)
    .join("/");
}

export function parseAppointmentDateInput(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return "";
  const [day, month, year] = value.split("/");
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}

export function appointmentDateInputError(value: string) {
  if (!value) return "Vui lòng nhập ngày tư vấn.";
  const iso = parseAppointmentDateInput(value);
  if (!iso)
    return "Vui lòng nhập ngày hợp lệ theo dạng ngày/tháng/năm (dd/mm/yyyy).";
  if (iso < appointmentDate())
    return "Không thể chọn ngày tư vấn trong quá khứ.";
  if (iso > appointmentDate(config.maxDaysAhead))
    return `Vui lòng chọn ngày trong ${config.maxDaysAhead} ngày tới.`;
  return "";
}
export function emailStatusText(appointment: Appointment) {
  switch (appointment.emailStatus) {
    case "sent":
      return `Email xác nhận đã được gửi tới ${appointment.email}. Bạn vui lòng kiểm tra cả mục thư rác.`;
    case "not_configured":
      return "Lịch hẹn đã được lưu. Dịch vụ email chưa được cấu hình; vui lòng giữ mã hẹn bên dưới.";
    case "failed":
      return "Lịch hẹn đã được lưu nhưng chưa gửi được email xác nhận. Bạn có thể thử gửi lại sau một phút.";
    default:
      return "Lịch hẹn đã được lưu. Email xác nhận đang được xử lý.";
  }
}

export function rememberAppointment(code: string, token: string) {
  try {
    sessionStorage.setItem(`mira_appointment_${code}`, token);
  } catch {
    /* Navigation state is a fallback when storage is unavailable. */
  }
}
export function appointmentToken(code: string) {
  try {
    return sessionStorage.getItem(`mira_appointment_${code}`);
  } catch {
    return null;
  }
}
