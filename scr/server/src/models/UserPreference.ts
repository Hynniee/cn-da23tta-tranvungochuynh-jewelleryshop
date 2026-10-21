import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      index: true,
    },
    categories: { type: Map, of: Number, default: {} },
    materials: { type: Map, of: Number, default: {} },
    styles: { type: Map, of: Number, default: {} },
    priceMin: { type: Number, default: 0 },
    priceMax: { type: Number, default: 0 },
    updatedFromEvents: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export default mongoose.model("UserPreference", schema);
