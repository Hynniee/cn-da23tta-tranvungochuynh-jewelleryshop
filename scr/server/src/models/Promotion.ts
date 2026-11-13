import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    type: {
      type: String,
      enum: ["voucher", "discount", "flash_sale"],
      required: true,
    },
    code: { type: String, unique: true, sparse: true },
    discountType: { type: String, enum: ["percent", "amount"], required: true },
    value: { type: Number, required: true, min: 1 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    allProducts: { type: Boolean, default: false },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ active: 1, startsAt: 1, endsAt: 1 });
export default mongoose.model("Promotion", schema);
