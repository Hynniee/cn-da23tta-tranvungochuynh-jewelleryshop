import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    mode: { type: String, enum: ["advisor", "diamond"], default: "advisor" },
    intent: { type: mongoose.Schema.Types.Mixed, default: {} },
    turns: { type: [{ role: String, text: String }], default: [] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true, optimisticConcurrency: true },
);
export default mongoose.model("AdvisorSession", schema);
