import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    source: {
      type: String,
      enum: ["personalized", "advisor", "dss"],
      default: "personalized",
    },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    clickedProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    addedToCart: { type: Boolean, default: false },
    purchased: { type: Boolean, default: false },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export default mongoose.model("RecommendationLog", schema);
