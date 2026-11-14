import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      required: true,
    },
    lastReopenedMessage: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
);
export default mongoose.model("SupportConversation", schema);
