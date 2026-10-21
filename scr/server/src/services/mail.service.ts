import nodemailer from "nodemailer";
import {
  appointmentEmail,
  type AppointmentDetails,
} from "./appointment.service.js";

export const mailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.MAIL_FROM,
  );

export async function sendAppointmentEmail(appointment: AppointmentDetails) {
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM,
    to: { name: appointment.name, address: appointment.email },
    ...appointmentEmail(appointment),
  });
  if (!info.accepted.length) throw new Error("SMTP rejected recipient");
}
