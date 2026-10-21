import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { request } from "../lib/api";
import {
  appointmentToken,
  appointmentDateInputError,
  appointmentEmailInputError,
  formatAppointmentDateInput,
  parseAppointmentDateInput,
  rememberAppointment,
  type Appointment,
  type AppointmentForm,
} from "../models/appointment.model";

export function useAppointmentController() {
  const navigate = useNavigate();
  const token = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const [form, setForm] = useState<AppointmentForm>({
    name: "",
    email: "",
    phone: "",
    salonId: "",
    date: "",
    time: "",
    interest: "Chưa xác định",
    budget: "Chưa xác định",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [dateError, setDateError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const update = (field: keyof AppointmentForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "date" ? { time: "" } : {}),
    }));
    setError("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const invalidEmail = appointmentEmailInputError(form.email);
    if (invalidEmail) {
      setEmailTouched(true);
      setEmailError(invalidEmail);
      return;
    }
    const invalidDate = appointmentDateInputError(dateInput);
    if (invalidDate) {
      setDateError(invalidDate);
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      const appointment: Appointment = await request("/appointments", {
        method: "POST",
        body: JSON.stringify({ ...form, bookingToken: token.current }),
      });
      rememberAppointment(appointment.code, token.current);
      navigate(`/appointments/${appointment.code}`, {
        state: { appointment, token: token.current },
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Chưa đặt được lịch. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };
  const updateDate = (value: string) => {
    const formatted = formatAppointmentDateInput(value);
    const invalidDate = appointmentDateInputError(formatted);
    setDateInput(formatted);
    setDateError(formatted.length === 10 ? invalidDate : "");
    update("date", invalidDate ? "" : parseAppointmentDateInput(formatted));
    return invalidDate;
  };
  const validateDate = () => {
    const invalidDate = appointmentDateInputError(dateInput);
    setDateError(invalidDate);
    return invalidDate;
  };
  const updateEmail = (value: string) => {
    update("email", value);
    const invalidEmail = appointmentEmailInputError(value);
    if (emailTouched) setEmailError(invalidEmail);
    return invalidEmail;
  };
  const validateEmail = () => {
    update("email", form.email.trim());
    const invalidEmail = appointmentEmailInputError(form.email);
    setEmailTouched(true);
    setEmailError(invalidEmail);
    return invalidEmail;
  };
  return {
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
  };
}

export function useAppointmentConfirmation() {
  const { code = "" } = useParams();
  const location = useLocation();
  const state = location.state as {
    appointment?: Appointment;
    token?: string;
  } | null;
  const token =
    appointmentToken(code) ||
    (state?.appointment?.code === code ? state.token : null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setAppointment(null);
    if (!token) {
      setError(
        "Vui lòng mở trang xác nhận trên trình duyệt đã đặt lịch. Nếu không còn phiên, hãy giữ mã hẹn trong email xác nhận.",
      );
      setLoading(false);
      return;
    }
    request(`/appointments/${encodeURIComponent(code)}`, {
      headers: { "X-Appointment-Token": token },
    })
      .then((data) => {
        if (active) setAppointment(data);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code, token]);
  const resend = async () => {
    if (!token || sending) return;
    setSending(true);
    setError("");
    try {
      setAppointment(
        await request(`/appointments/${encodeURIComponent(code)}/email`, {
          method: "POST",
          headers: { "X-Appointment-Token": token },
        }),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa gửi được email.");
    } finally {
      setSending(false);
    }
  };
  return { appointment, loading, sending, error, resend };
}
