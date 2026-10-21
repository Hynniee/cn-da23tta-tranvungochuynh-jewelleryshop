import { createHash, randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import Appointment from "../models/Appointment.js";
import { validateAppointment } from "../services/appointment.service.js";
import {
  mailConfigured,
  sendAppointmentEmail,
} from "../services/mail.service.js";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const validToken = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    value,
  );
type Booking = InstanceType<typeof Appointment>;
const publicBooking = (booking: Booking) => ({
  code: booking.code,
  name: booking.name,
  email: booking.email,
  phone: booking.phone,
  salonId: booking.salonId,
  salonName: booking.salonName,
  date: booking.date,
  time: booking.time,
  startsAt: booking.startsAt,
  timeZone: booking.timeZone,
  interest: booking.interest,
  budget: booking.budget,
  notes: booking.notes,
  status: booking.status,
  emailStatus: booking.emailStatus,
  emailSentAt: booking.emailSentAt,
});

async function deliverEmail(booking: Booking) {
  if (!mailConfigured()) {
    booking.emailStatus = "not_configured";
    await booking.save();
    return booking;
  }
  // Claim the attempt atomically so repeated requests cannot send duplicate mail.
  const claimed = await Appointment.findOneAndUpdate(
    {
      _id: booking._id,
      emailStatus: { $ne: "sent" },
      emailAttempts: { $lt: 5 },
      $or: [
        { emailAttemptedAt: { $exists: false } },
        { emailAttemptedAt: { $lte: new Date(Date.now() - 60000) } },
      ],
    },
    {
      $set: { emailStatus: "pending", emailAttemptedAt: new Date() },
      $inc: { emailAttempts: 1 },
    },
    { new: true },
  );
  if (!claimed) return booking;
  try {
    await sendAppointmentEmail({
      ...claimed.toObject(),
      notes: claimed.notes || "",
    });
    claimed.emailStatus = "sent";
    claimed.emailSentAt = new Date();
  } catch (error) {
    claimed.emailStatus = "failed";
    const smtp = error as { code?: string; responseCode?: number };
    // Keep credentials and message contents out of logs.
    console.error(`Appointment email failed: ${claimed.code}`, {
      code: smtp.code,
      responseCode: smtp.responseCode,
    });
  }
  await claimed.save();
  return claimed;
}

export const createAppointment: RequestHandler = async (req, res) => {
  const token = req.body.bookingToken;
  if (!validToken(token)) {
    res.status(400).json({
      message: "Phiên đặt lịch không hợp lệ. Vui lòng tải lại trang.",
    });
    return;
  }
  const accessTokenHash = hash(token);
  const existing = await Appointment.findOne({ accessTokenHash });
  if (existing) {
    res.json(publicBooking(existing));
    return;
  }
  let details;
  try {
    details = validateAppointment(req.body);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
    return;
  }
  const ipHash = hash(req.ip || "unknown");
  if (
    (await Appointment.countDocuments({
      ipHash,
      createdAt: { $gte: new Date(Date.now() - 3600000) },
    })) >= 5
  ) {
    res.status(429).json({
      message: "Bạn đã đặt nhiều lịch gần đây. Vui lòng thử lại sau một giờ.",
    });
    return;
  }
  let booking;
  try {
    booking = await Appointment.create({
      ...details,
      accessTokenHash,
      ipHash,
      code: `MIRA-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      const duplicate = await Appointment.findOne({ accessTokenHash });
      if (duplicate) {
        res.json(publicBooking(duplicate));
        return;
      }
    }
    throw error;
  }
  res.status(201).json(publicBooking(await deliverEmail(booking)));
};

export const getAppointment: RequestHandler = async (req, res) => {
  const token = req.get("X-Appointment-Token");
  const booking = validToken(token)
    ? await Appointment.findOne({
        code: req.params.code,
        accessTokenHash: hash(token),
      })
    : null;
  if (!booking) {
    res
      .status(404)
      .json({ message: "Không tìm thấy lịch hẹn trên phiên đặt lịch này." });
    return;
  }
  res.json(publicBooking(booking));
};

export const resendConfirmation: RequestHandler = async (req, res) => {
  const token = req.get("X-Appointment-Token");
  const booking = validToken(token)
    ? await Appointment.findOne({
        code: req.params.code,
        accessTokenHash: hash(token),
      })
    : null;
  if (!booking) {
    res
      .status(404)
      .json({ message: "Không tìm thấy lịch hẹn trên phiên đặt lịch này." });
    return;
  }
  if (booking.emailStatus === "sent") {
    res.json(publicBooking(booking));
    return;
  }
  if (!mailConfigured()) {
    res.status(503).json({
      message:
        "Lịch hẹn đã được lưu. Dịch vụ email chưa được cấu hình, vui lòng giữ mã hẹn.",
    });
    return;
  }
  if (
    booking.emailAttempts >= 5 ||
    (booking.emailAttemptedAt &&
      Date.now() - booking.emailAttemptedAt.getTime() < 60000)
  ) {
    res.status(429).json({
      message:
        "Vui lòng chờ ít nhất một phút giữa các lần gửi, tối đa 5 lần cho một lịch hẹn.",
    });
    return;
  }
  res.json(publicBooking(await deliverEmail(booking)));
};
