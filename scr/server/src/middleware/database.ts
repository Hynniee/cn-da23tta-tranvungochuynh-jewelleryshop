import mongoose from "mongoose";
import type { RequestHandler } from "express";

export const requireDatabase: RequestHandler = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      message: "Chưa kết nối được MongoDB. Vui lòng thử lại sau.",
    });
    return;
  }
  next();
};
