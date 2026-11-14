import storeConfig from "../data/storeConfig.json" with { type: "json" };
import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, sparse: true },
    description: String,
    category: {
      type: String,
      enum: storeConfig.categories,
      required: true,
    },
    material: { type: String, required: true },
    stone: String,
    metals: [String],
    gemstone: String,
    imageUrl: String,
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
    sizeStocks: {
      type: [
        new mongoose.Schema(
          {
            size: { type: String, required: true },
            stock: {
              type: Number,
              required: true,
              min: 0,
              validate: {
                validator: Number.isSafeInteger,
                message: "Tồn kho phải là số nguyên không âm",
              },
            },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    rating: { type: Number, default: 0 },
    stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Tồn kho phải là số nguyên không âm",
      },
    },
    images: [String],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export default mongoose.model("Product", schema);
