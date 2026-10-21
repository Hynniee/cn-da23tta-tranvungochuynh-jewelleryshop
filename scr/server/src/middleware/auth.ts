import { jwtSecret } from "../config.js";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}
export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(h.slice(7), jwtSecret) as any;
    } catch {}
  }
  next();
}
export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer "))
    return res.status(401).json({ message: "Vui lòng đăng nhập" });
  try {
    req.user = jwt.verify(h.slice(7), jwtSecret) as any;
    next();
  } catch {
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  }
}
export const allow =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) =>
    roles.includes(req.user?.role || "")
      ? next()
      : res.status(403).json({ message: "Không có quyền thực hiện" });
export const admin = allow("admin", "manager");
