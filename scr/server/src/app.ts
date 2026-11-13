import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import reviewRoutes from "./routes/reviews.js";
import orderRoutes from "./routes/orders.js";
import behaviorRoutes from "./routes/behaviors.js";
import recommendationRoutes from "./routes/recommendations.js";
import diamondRoutes from "./routes/diamonds.js";
import advisorRoutes from "./routes/advisor.js";
import paymentRoutes from "./routes/payments.js";
import analyticsRoutes from "./routes/analytics.js";
import auditRoutes from "./routes/audit.js";
import assistantRoutes from "./routes/assistant.js";
import appointmentRoutes from "./routes/appointments.js";
import {
  requireDatabase,
  isDatabaseConnectionError,
} from "./middleware/database.js";
import locationRoutes from "./routes/locations.js";
import uploadRoutes, { productUploadDirectory } from "./routes/uploads.js";
import promotionRoutes from "./routes/promotions.js";
import { PromotionError } from "./services/promotion.service.js";
const app = express();
mongoose.set("bufferCommands", false);
app.use(
  cors({
    origin: (
      process.env.CLIENT_URL || "http://localhost:8080,http://localhost:5173"
    ).split(","),
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});
app.get("/api/health", (_q, res) =>
  res.json({
    ok: true,
    name: "MIRA API",
    database: mongoose.connection.readyState === 1 ? "mongodb" : "disconnected",
  }),
);
app.use("/api/locations", locationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use(
  "/api/uploads/products",
  express.static(productUploadDirectory, {
    dotfiles: "deny",
    maxAge: "1y",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/products", requireDatabase, productRoutes);
app.use("/api/products/:slug/reviews", requireDatabase, reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/behaviors", behaviorRoutes);
app.use("/api/recommendations", requireDatabase, recommendationRoutes);
app.use("/api/diamonds", requireDatabase, diamondRoutes);
app.use("/api/advisor", advisorRoutes);
app.use("/api/assistant", requireDatabase, assistantRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit", auditRoutes);
app.use((_req, res) => {
  res.status(404).json({ message: "Không tìm thấy API" });
});
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof PromotionError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    if (isDatabaseConnectionError(err)) {
      console.warn("Database request unavailable", {
        method: _req.method,
        path: _req.path,
        error: err.name,
      });
      res.status(503).json({
        code: "DATABASE_UNAVAILABLE",
        message:
          "Kết nối MongoDB Atlas đang gián đoạn hoặc chưa truy cập được primary. Chưa xác nhận được yêu cầu; vui lòng kiểm tra kết nối cơ sở dữ liệu rồi thử lại.",
      });
      return;
    }
    if (err.code === 11000) {
      res.status(409).json({ message: "Dữ liệu đã tồn tại" });
      return;
    }
    const status =
      err.name === "ValidationError" || err.name === "CastError"
        ? 400
        : Number.isInteger(err.status) && err.status >= 400 && err.status < 500
          ? err.status
          : 500;
    if (status === 500) console.error(err);
    res.status(status).json({
      message:
        status === 413
          ? "Dữ liệu gửi lên vượt quá dung lượng cho phép"
          : status < 500
            ? "Dữ liệu yêu cầu không hợp lệ"
            : "Lỗi máy chủ",
    });
  },
);

export default app;
