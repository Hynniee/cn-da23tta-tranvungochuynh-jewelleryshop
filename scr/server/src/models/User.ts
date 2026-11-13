import mongoose from "mongoose";
const savedAddress = new mongoose.Schema({
  _id: { type: String, required: true },
  label: String,
  name: { type: String, required: true },
  phone: { type: String, required: true },
  provinceCode: String,
  provinceName: String,
  wardCode: String,
  wardName: String,
  addressLine: String,
  address: String,
});
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: String,
    address: String,
    addresses: { type: [savedAddress], default: [] },
    defaultAddressId: String,
    birthday: String,
    gender: String,
    role: {
      type: String,
      enum: ["customer", "staff", "product_manager", "manager", "admin"],
      default: "customer",
    },
  },
  { timestamps: true },
);
export default mongoose.model("User", schema);
