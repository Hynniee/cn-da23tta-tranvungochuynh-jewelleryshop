import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderCode: { type: String, required: true, unique: true },
    amountExpected: { type: Number, required: true },
    amountReceived: { type: Number, default: 0 },
    transactionId: { type: String, sparse: true, unique: true },
    bankCode: String,
    transferContent: String,
    paymentMethod: { type: String, default: "BANK_QR" },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "MISMATCH", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    rawWebhook: { type: mongoose.Schema.Types.Mixed },
    paidAt: Date,
  },
  { timestamps: true },
);
export default mongoose.model("Payment", schema);
