import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    accessTokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    ipHash: { type: String, required: true, select: false },
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 254 },
    phone: { type: String, required: true, maxlength: 20 },
    salonId: { type: String, required: true },
    salonName: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    startsAt: { type: Date, required: true },
    timeZone: { type: String, required: true },
    interest: { type: String, required: true },
    budget: { type: String, required: true },
    notes: { type: String, maxlength: 1000, default: "" },
    status: { type: String, enum: ["booked"], default: "booked" },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "not_configured"],
      default: "pending",
    },
    emailAttempts: { type: Number, default: 0 },
    emailAttemptedAt: Date,
    emailSentAt: Date,
  },
  { timestamps: true },
);
schema.index({ ipHash: 1, createdAt: 1 });
export default mongoose.model("Appointment", schema);
