import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    shape: { type: String, default: "Round" },
    carat: { type: Number, required: true },
    cut: { type: String, required: true },
    color: { type: String, required: true },
    clarity: { type: String, required: true },
    price: { type: Number, required: true },
    giaReport: String,
    image: String,
    stock: { type: Number, default: 1 },
  },
  { timestamps: true },
);
export default mongoose.model("Diamond", schema);
