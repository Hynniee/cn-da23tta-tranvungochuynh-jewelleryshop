import type { RequestHandler } from "express";
import AuditLog from "../models/AuditLog.js";

export const listAuditLogs: RequestHandler = async (_q, res) =>
  res.json(
    await AuditLog.find()
      .populate("actor", "name email")
      .sort({ createdAt: -1 })
      .limit(200),
  );
