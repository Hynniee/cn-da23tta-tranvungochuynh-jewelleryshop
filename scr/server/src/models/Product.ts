import storeConfig from "../data/storeConfig.json" with { type: "json" };
import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    category: {
      type: String,
      enum: storeConfig.categories,
      required: true,
    },
    material: { type: String, required: true },
    stone: { type: String, default: "Không đính đá" },
    shape: {
      type: String,
      enum: [
        "ROUND",
        "OVAL",
        "EMERALD",
        "PRINCESS",
        "PEAR",
        "CUSHION",
      ] as string[],
    },
    carat: { type: Number, min: 0 },
    ringStyle: {
      type: String,
      enum: [
        "Solitaire",
        "Halo",
        "Pavé",
        "Three Stone",
        "Eternity",
      ] as string[],
    },
    engravingAllowed: { type: Boolean, default: false },
    style: { type: String, default: "Tối giản" },
    color: String,
    gender: { type: String, default: "Nữ" },
    occasion: [String],
    sizes: [String],
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    rating: { type: Number, default: 4.5 },
    stock: { type: Number, default: 0, min: 0 },
    images: [String],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export default mongoose.model("Product", schema);
