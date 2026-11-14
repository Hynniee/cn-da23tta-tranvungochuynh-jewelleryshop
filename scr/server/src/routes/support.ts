import { Router } from "express";
import mongoose from "mongoose";
import { auth, admin, type AuthRequest } from "../middleware/auth.js";
import {
  requireDatabase,
  requireWritableDatabase,
} from "../middleware/database.js";
import Conversation from "../models/SupportConversation.js";
import Message from "../models/SupportMessage.js";
import User from "../models/User.js";
import Order from "../models/Order.js";

const router = Router();
const objectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
router.use(auth, requireDatabase);
// Recheck the account and role rather than trusting a stale role in a JWT.
router.use(async (req: AuthRequest, res, next) => {
  if (!objectId(req.user?.id))
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  const user = await User.findById(req.user.id)
    .select("name email role")
    .lean();
  if (!user)
    return res.status(401).json({ message: "Tài khoản không tồn tại" });
  req.user!.role = user.role;
  next();
});

async function history(conversation: any, before: unknown) {
  const rows = await Message.find({
    conversation: conversation._id,
    ...(before ? { _id: { $lt: before } } : {}),
  })
    .sort({ _id: -1 })
    .limit(51)
    .lean();
  const hasMore = rows.length > 50;
  const messages = rows.slice(0, 50).reverse();
  return { conversation, messages, hasMore };
}

router.get("/mine", async (req: AuthRequest, res) => {
  if (req.query.before && !objectId(req.query.before))
    return res.status(400).json({ message: "Mốc tin nhắn không hợp lệ" });
  const conversation = await Conversation.findOne({
    customer: req.user!.id,
  }).lean();
  res.json(
    conversation
      ? await history(conversation, req.query.before)
      : { conversation: null, messages: [], hasMore: false },
  );
});

function validMessage(body: any) {
  return (
    typeof body.body === "string" &&
    body.body.trim().length > 0 &&
    body.body.trim().length <= 2000 &&
    typeof body.clientId === "string" &&
    /^[a-zA-Z0-9_-]{16,80}$/.test(body.clientId) &&
    (body.orderId === undefined || objectId(body.orderId))
  );
}

async function send(
  req: AuthRequest,
  conversation: any,
  senderRole: "customer" | "admin",
) {
  const body = req.body.body.trim();
  const data = {
    conversation: conversation._id,
    sender: req.user!.id,
    senderRole,
    clientId: req.body.clientId,
    body,
    order: undefined as mongoose.Types.ObjectId | undefined,
    orderCode: undefined as string | undefined,
  };
  if (req.body.orderId) {
    const order = await Order.findOne({
      _id: req.body.orderId,
      user: conversation.customer,
    })
      .select("orderCode")
      .lean();
    if (!order)
      return {
        status: 404,
        data: { message: "Không tìm thấy đơn hàng của khách hàng này" },
      };
    data.order = order._id;
    data.orderCode =
      order.orderCode || `#${String(order._id).slice(-8).toUpperCase()}`;
  }
  let message;
  let created = false;
  try {
    message = await Message.create(data);
    created = true;
  } catch (error: any) {
    if (error.code !== 11000) throw error;
    message = await Message.findOne({
      sender: req.user!.id,
      clientId: req.body.clientId,
    });
    if (
      !message ||
      String(message.conversation) !== String(conversation._id) ||
      message.body !== body ||
      String(message.order || "") !== String(data.order || "")
    ) {
      return {
        status: 409,
        data: {
          message:
            "Mã gửi đã được sử dụng cho tin nhắn khác. Vui lòng tải lại hội thoại",
        },
      };
    }
  }
  // Retrying the same clientId repairs a failed status update without duplicating a message.
  await Conversation.updateOne(
    {
      _id: conversation._id,
      $or: [
        { lastReopenedMessage: { $exists: false } },
        { lastReopenedMessage: { $lt: message!._id } },
      ],
    },
    { $set: { status: "open", lastReopenedMessage: message!._id } },
  );
  return { status: created ? 201 : 200, data: message };
}

router.post(
  "/mine/messages",
  requireWritableDatabase,
  async (req: AuthRequest, res) => {
    if (!validMessage(req.body))
      return res.status(400).json({
        message: "Nhập tin nhắn từ 1 đến 2.000 ký tự và mã gửi hợp lệ",
      });
    // Check an order before creating an otherwise empty conversation.
    if (
      req.body.orderId &&
      !(await Order.exists({ _id: req.body.orderId, user: req.user!.id }))
    )
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hàng của bạn" });
    let conversation;
    try {
      conversation = await Conversation.findOneAndUpdate(
        { customer: req.user!.id },
        { $setOnInsert: { customer: req.user!.id, status: "open" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error: any) {
      if (error.code !== 11000) throw error;
      conversation = await Conversation.findOne({ customer: req.user!.id });
    }
    const result = await send(req, conversation, "customer");
    res.status(result.status).json(result.data);
  },
);

async function markRead(
  conversationId: unknown,
  senderRole: string,
  ids: unknown,
) {
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 50 ||
    !ids.every(objectId)
  )
    return null;
  return Message.updateMany(
    {
      conversation: conversationId,
      senderRole,
      _id: { $in: ids },
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );
}
router.post(
  "/mine/read",
  requireWritableDatabase,
  async (req: AuthRequest, res) => {
    const conversation = await Conversation.findOne({
      customer: req.user!.id,
    }).lean();
    if (!conversation)
      return res.status(404).json({ message: "Chưa có hội thoại" });
    const result = await markRead(conversation._id, "admin", req.body.ids);
    if (!result)
      return res
        .status(400)
        .json({ message: "Danh sách tin nhắn không hợp lệ" });
    res.json({ updated: result.modifiedCount });
  },
);

router.use("/admin", admin);
router.get("/admin/unread", async (_req, res) => {
  res.json({
    count: await Message.countDocuments({
      senderRole: "customer",
      readAt: null,
    }),
  });
});
router.get("/admin", async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
  const q =
    typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const status = ["open", "resolved"].includes(String(req.query.status))
    ? String(req.query.status)
    : "";
  const search = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const [result] = await Conversation.aggregate([
    { $match: status ? { status } : {} },
    {
      $lookup: {
        from: User.collection.name,
        localField: "customer",
        foreignField: "_id",
        as: "customer",
        pipeline: [{ $project: { name: 1, email: 1 } }],
      },
    },
    { $unwind: "$customer" },
    ...(q
      ? [
          {
            $match: {
              $or: [
                { "customer.name": { $regex: search, $options: "i" } },
                { "customer.email": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),
    {
      $lookup: {
        from: Message.collection.name,
        let: { conversation: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$conversation", "$$conversation"] } } },
          { $sort: { _id: -1 } },
          { $limit: 1 },
          { $project: { body: 1, createdAt: 1, senderRole: 1 } },
        ],
        as: "last",
      },
    },
    {
      $lookup: {
        from: Message.collection.name,
        let: { conversation: "$_id" },
        pipeline: [
          {
            $match: {
              senderRole: "customer",
              readAt: null,
              $expr: { $eq: ["$conversation", "$$conversation"] },
            },
          },
          { $count: "count" },
        ],
        as: "unread",
      },
    },
    {
      $set: {
        lastMessage: { $arrayElemAt: ["$last", 0] },
        unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] },
        lastMessageAt: {
          $ifNull: [{ $arrayElemAt: ["$last.createdAt", 0] }, "$createdAt"],
        },
      },
    },
    { $sort: { lastMessageAt: -1, _id: -1 } },
    { $project: { last: 0, unread: 0 } },
    {
      $facet: {
        items: [{ $skip: (Math.floor(page) - 1) * 20 }, { $limit: 20 }],
        total: [{ $count: "count" }],
      },
    },
  ]);
  const total = result?.total[0]?.count || 0;
  res.json({
    items: result?.items || [],
    total,
    page: Math.floor(page),
    pages: Math.ceil(total / 20),
  });
});

router.use("/admin/:id", async (req, res, next) => {
  if (!objectId(req.params.id))
    return res.status(400).json({ message: "Mã hội thoại không hợp lệ" });
  const conversation = await Conversation.findById(req.params.id).lean();
  if (!conversation)
    return res.status(404).json({ message: "Không tìm thấy hội thoại" });
  res.locals.conversation = conversation;
  next();
});
router.get("/admin/:id", async (req, res) => {
  if (req.query.before && !objectId(req.query.before))
    return res.status(400).json({ message: "Mốc tin nhắn không hợp lệ" });
  res.json(await history(res.locals.conversation, req.query.before));
});
router.post(
  "/admin/:id/messages",
  requireWritableDatabase,
  async (req: AuthRequest, res) => {
    if (!validMessage(req.body))
      return res.status(400).json({
        message: "Nhập tin nhắn từ 1 đến 2.000 ký tự và mã gửi hợp lệ",
      });
    const result = await send(req, res.locals.conversation, "admin");
    res.status(result.status).json(result.data);
  },
);
router.post("/admin/:id/read", requireWritableDatabase, async (req, res) => {
  const result = await markRead(
    res.locals.conversation._id,
    "customer",
    req.body.ids,
  );
  if (!result)
    return res.status(400).json({ message: "Danh sách tin nhắn không hợp lệ" });
  res.json({ updated: result.modifiedCount });
});
router.patch("/admin/:id", requireWritableDatabase, async (req, res) => {
  if (!["open", "resolved"].includes(req.body.status))
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  const conversation = await Conversation.findByIdAndUpdate(
    res.locals.conversation._id,
    { $set: { status: req.body.status } },
    { new: true },
  );
  res.json(conversation);
});
export default router;
