import config from "../data/appointmentConfig.json" with { type: "json" };
const emailPattern = new RegExp(config.emailPattern);

export function vietnamDate(date = new Date()): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function validateAppointment(
  body: Record<string, unknown>,
  now = new Date(),
) {
  const text = (key: string) =>
    typeof body[key] === "string" ? body[key].trim() : "";
  const name = text("name"),
    email = text("email").toLowerCase();
  const phone = text("phone").replace(/[ .()-]/g, "");
  const salon = config.salons.find((entry) => entry.id === text("salonId"));
  const date = text("date"),
    time = text("time");
  const interest = text("interest"),
    budget = text("budget"),
    notes = text("notes");
  if (!name || name.length > 100 || /[\r\n]/.test(name))
    throw new Error("Vui lòng nhập họ tên hợp lệ (tối đa 100 ký tự).");
  if (
    email.length > 254 ||
    email.split("@")[0].length > 64 ||
    !emailPattern.test(email)
  )
    throw new Error("Vui lòng nhập địa chỉ email hợp lệ.");
  if (!/^(?:0\d{9}|\+84\d{9})$/.test(phone))
    throw new Error("Vui lòng nhập số điện thoại Việt Nam hợp lệ.");
  if (!salon) throw new Error("Vui lòng chọn Salon.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !config.times.includes(time))
    throw new Error("Ngày hoặc khung giờ tư vấn không hợp lệ.");
  const startsAt = new Date(`${date}T${time}:00${config.utcOffset}`);
  const dateLimit = vietnamDate(
    new Date(now.getTime() + config.maxDaysAhead * 86400000),
  );
  if (
    !Number.isFinite(startsAt.getTime()) ||
    vietnamDate(startsAt) !== date ||
    startsAt <= now ||
    date > dateLimit
  )
    throw new Error(
      `Vui lòng chọn thời gian trong tương lai, tối đa ${config.maxDaysAhead} ngày tới.`,
    );
  if (!config.interests.includes(interest) || !config.budgets.includes(budget))
    throw new Error("Vui lòng chọn nhu cầu và khoảng ngân sách hợp lệ.");
  if (notes.length > 1000) throw new Error("Ghi chú tối đa 1.000 ký tự.");
  return {
    name,
    email,
    phone,
    salonId: salon.id,
    salonName: salon.name,
    date,
    time,
    startsAt,
    timeZone: config.timeZone,
    interest,
    budget,
    notes,
  };
}

export type AppointmentDetails = ReturnType<typeof validateAppointment> & {
  code: string;
};

export function appointmentEmail(appointment: AppointmentDetails) {
  const date = appointment.date.split("-").reverse().join("/");
  return {
    subject: `MIRA · Xác nhận lịch hẹn ${appointment.code}`,
    text: [
      `Xin chào ${appointment.name},`,
      "",
      "MIRA đã ghi nhận lịch tư vấn riêng của bạn.",
      `Mã hẹn: ${appointment.code}`,
      `Salon: ${appointment.salonName}`,
      `Thời gian: ${appointment.time}, ngày ${date} (giờ Việt Nam, UTC+7)`,
      `Họ tên: ${appointment.name}`,
      `Email: ${appointment.email}`,
      `Điện thoại: ${appointment.phone}`,
      `Nhu cầu: ${appointment.interest}`,
      `Ngân sách: ${appointment.budget}`,
      `Ghi chú: ${appointment.notes || "Không có"}`,
      "",
      "Vui lòng giữ mã hẹn để cung cấp cho chuyên viên khi đến Salon.",
      "Cảm ơn bạn đã lựa chọn MIRA Private Salon.",
    ].join("\n"),
  };
}
