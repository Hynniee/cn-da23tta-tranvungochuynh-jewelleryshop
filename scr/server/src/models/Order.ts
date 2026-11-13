import mongoose from "mongoose";
const item = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: String,
    price: Number,
    originalPrice: Number,
    promotion: new mongoose.Schema(
      { id: String, name: String, type: String, endsAt: String },
      { _id: false },
    ),
    quantity: Number,
    size: String,
    image: String,
    material: String,
    engraving: String,
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    items: [item],
    customer: {
      name: String,
      phone: String,
      email: String,
      address: String,
      provinceCode: String,
      provinceName: String,
      wardCode: String,
      wardName: String,
      addressLine: String,
      note: String,
    },
    subtotal: Number,
    shippingFee: Number,
    discountTotal: { type: Number, default: 0 },
    voucher: { id: String, code: String, name: String, discount: Number },
    total: Number,
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PENDING", "PAID", "MISMATCH", "REFUNDED"],
      default: "UNPAID",
    },
    status: {
      type: String,
      enum: [
        "pending_payment",
        "pending",
        "confirmed",
        "shipping",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
  },
  { timestamps: true },
);
schema.pre("validate", function (next) {
  if (!this.orderCode)
    this.orderCode = `MIRA${Date.now().toString().slice(-9)}`;
  next();
});
export default mongoose.model("Order", schema);
