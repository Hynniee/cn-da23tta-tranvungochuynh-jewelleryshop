import mongoose from "mongoose";
import type { RequestHandler } from "express";

export const requireDatabase: RequestHandler = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      message:
        "Chức năng này cần kết nối MongoDB. Hiện hệ thống đang chạy demo.",
    });
    return;
  }
  next();
};
