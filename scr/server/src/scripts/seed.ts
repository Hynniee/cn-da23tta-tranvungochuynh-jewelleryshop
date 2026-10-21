import { demoProducts } from "../data/demoProducts.js";
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Diamond from "../models/Diamond.js";

if (!process.env.MONGO_URI)
  throw new Error("Thiếu MONGO_URI trong server/.env");

await mongoose.connect(process.env.MONGO_URI);
await Product.deleteMany({});
await Product.insertMany(
  demoProducts.map((p, i) => ({
    ...p,
    images: [p.image],
    stock: 8 + (i % 7) * 3,
    description: `${p.name} thuộc bộ sưu tập MIRA, chế tác từ ${p.material}. Thiết kế ${p.style.toLowerCase()}, phù hợp cho ${p.occasion.join(", ").toLowerCase()}.`,
  })),
);

await Diamond.deleteMany({});
await Diamond.insertMany([
  {
    code: "GIA-MIRA-001",
    carat: 0.7,
    cut: "Excellent",
    color: "F",
    clarity: "VS1",
    price: 32000000,
    giaReport: "GIA-001",
  },
  {
    code: "GIA-MIRA-002",
    carat: 1,
    cut: "Excellent",
    color: "E",
    clarity: "VVS2",
    price: 62000000,
    giaReport: "GIA-002",
  },
  {
    code: "GIA-MIRA-003",
    carat: 1.2,
    cut: "Very Good",
    color: "G",
    clarity: "VS1",
    price: 68000000,
    giaReport: "GIA-003",
  },
  {
    code: "GIA-MIRA-004",
    carat: 1.5,
    cut: "Excellent",
    color: "E",
    clarity: "VVS1",
    price: 118000000,
    giaReport: "GIA-004",
  },
  {
    code: "GIA-MIRA-005",
    carat: 0.9,
    cut: "Excellent",
    color: "D",
    clarity: "VS2",
    price: 54000000,
    giaReport: "GIA-005",
  },
  {
    code: "GIA-MIRA-006",
    carat: 2,
    cut: "Excellent",
    color: "F",
    clarity: "VVS2",
    price: 176000000,
    giaReport: "GIA-006",
  },
]);

await User.deleteMany({ email: "admin@mira.vn" });
await User.create({
  name: "MIRA Admin",
  email: "admin@mira.vn",
  password: await bcrypt.hash("Admin@123", 10),
  role: "admin",
});
console.log(
  `Seed hoàn tất: ${demoProducts.length} sản phẩm, 6 kim cương, 1 admin`,
);
await mongoose.disconnect();
