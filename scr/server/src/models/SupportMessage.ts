import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: { type: String, enum: ["customer", "admin"], required: true },
    body: { type: String, required: true, maxlength: 2000 },
    clientId: { type: String, required: true, maxlength: 80 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    orderCode: String,
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ conversation: 1, _id: -1 });
schema.index({ sender: 1, clientId: 1 }, { unique: true });
schema.index({ senderRole: 1, readAt: 1, conversation: 1 });
export default mongoose.model("SupportMessage", schema);
