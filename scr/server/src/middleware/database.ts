import mongoose from "mongoose";
import type { RequestHandler } from "express";

export function isDatabaseConnectionError(error: {
  name?: string;
  code?: number;
}) {
  return (
    [
      "MongoServerSelectionError",
      "MongooseServerSelectionError",
      "MongoNetworkError",
      "MongoNetworkTimeoutError",
      "MongoOperationTimeoutError",
      "MongoTopologyClosedError",
      "MongoNotConnectedError",
    ].includes(error.name || "") ||
    [10107, 11600, 11602, 13435, 189].includes(error.code || 0)
  );
}

export const requireDatabase: RequestHandler = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      message: "Chưa kết nối được MongoDB. Vui lòng thử lại sau.",
    });
    return;
  }
  next();
};

// A connected secondary can serve the catalog but cannot accept product edits.
export const requireWritableDatabase: RequestHandler = async (
  _req,
  res,
  next,
) => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    res.status(503).json({
      code: "DATABASE_READ_ONLY",
      message:
        "Chưa kết nối được cơ sở dữ liệu để lưu thay đổi. Vui lòng thử lại sau.",
    });
    return;
  }
  try {
    await mongoose.connection.db
      .admin()
      .command({ ping: 1 }, { readPreference: "primary", timeoutMS: 2500 });
    next();
  } catch {
    res.status(503).json({
      code: "DATABASE_READ_ONLY",
      message:
        "Hiện chỉ đọc được dữ liệu, chưa kết nối được máy chủ ghi (primary) của MongoDB Atlas. Chưa lưu thay đổi; vui lòng kiểm tra kết nối Atlas rồi thử lại.",
    });
  }
};
