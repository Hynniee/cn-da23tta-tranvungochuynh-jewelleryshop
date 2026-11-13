import { Router } from "express";
import { auth, admin, AuthRequest } from "../middleware/auth.js";
import {
  requireDatabase,
  requireWritableDatabase,
} from "../middleware/database.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import { unresolvedPaymentMismatches } from "../services/payment-status.service.js";

const router = Router();
router.use(auth, admin, requireDatabase);
router.get("/", async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id)
    .select("customerNotificationsSeenAt")
    .lean();
  if (!user)
    return res.status(401).json({ message: "Tài khoản không tồn tại" });
  const now = new Date();
  const [pending, pendingPayment, products, customers, promotions, analytics] =
    await Promise.all([
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "pending_payment" }),
      Product.countDocuments({ stock: { $lte: 5 } }),
      User.countDocuments({
        role: "customer",
        createdAt: { $gt: user.customerNotificationsSeenAt || new Date(0) },
      }),
      Promotion.countDocuments({
        active: true,
        startsAt: { $lte: now },
        endsAt: { $gt: now, $lte: new Date(now.getTime() + 86400000) },
      }),
      unresolvedPaymentMismatches(),
    ]);
  const entries = {
    orders: {
      count: pending + pendingPayment,
      message: `${pending} đơn chờ xác nhận, ${pendingPayment} đơn chờ thanh toán.`,
    },
    products: {
      count: products,
      message: `${products} sản phẩm còn từ 5 sản phẩm trở xuống, cần kiểm tra tồn kho.`,
    },
    customers: {
      count: customers,
      message: `${customers} khách hàng đăng ký mới kể từ lần bạn xem gần nhất.`,
    },
    promotions: {
      count: promotions,
      message: `${promotions} khuyến mãi đang chạy sẽ kết thúc trong 24 giờ tới.`,
    },
    analytics: {
      count: analytics,
      message: `${analytics} giao dịch có số tiền chưa khớp, cần đối soát.`,
    },
  };
  res.json(entries);
});
router.post(
  "/customers/read",
  requireWritableDatabase,
  async (req: AuthRequest, res) => {
    const seenAt = new Date();
    const result = await User.updateOne(
      { _id: req.user!.id },
      { $max: { customerNotificationsSeenAt: seenAt } },
    );
    if (!result.matchedCount)
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    res.json({ seenAt });
  },
);
export default router;
