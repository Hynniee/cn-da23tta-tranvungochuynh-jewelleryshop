import type { RequestHandler } from "express";
import { jwtSecret } from "../config.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AuthRequest } from "../middleware/auth.js";

const token = (u: any) =>
  jwt.sign({ id: u._id.toString(), role: u.role }, jwtSecret, {
    expiresIn: "7d",
  });

export const register: RequestHandler = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    if (
      typeof name !== "string" ||
      !name.trim() ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 72
    )
      return res.status(400).json({ message: "Thiếu thông tin" });
    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email đã tồn tại" });
    const u = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
    });
    res.status(201).json({
      token: token(u),
      user: { id: u._id, name: u.name, email: u.email, role: u.role },
    });
  } catch (e) {
    res.status(500).json({ message: "Không thể đăng ký" });
  }
};

export const login: RequestHandler = async (req, res) => {
  const u = await User.findOne({
    email: String(req.body.email || "")
      .trim()
      .toLowerCase(),
  });
  if (
    !u ||
    !(await bcrypt.compare(
      typeof req.body.password === "string" ? req.body.password : "",
      u.password,
    ))
  )
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  res.json({
    token: token(u),
    user: { id: u._id, name: u.name, email: u.email, role: u.role },
  });
};

export const getProfile: RequestHandler = async (req: AuthRequest, res) => {
  const u = await User.findById(req.user!.id).select("-password");
  if (!u) return res.status(401).json({ message: "Tài khoản không tồn tại" });
  res.json(u);
};

export const updateProfile: RequestHandler = async (req: AuthRequest, res) => {
  const { name, phone, birthday, gender, address } = req.body;
  if (typeof name !== "string" || !name.trim())
    return res.status(400).json({ message: "Tên không hợp lệ" });
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { name: name.trim(), phone, birthday, gender, address },
    { new: true, runValidators: true },
  ).select("-password");
  if (!user)
    return res.status(404).json({ message: "Tài khoản không tồn tại" });
  res.json(user);
};
