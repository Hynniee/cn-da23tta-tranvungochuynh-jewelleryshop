import { Router } from "express";
import { auth, admin } from "../middleware/auth.js";
import {
  requireDatabase,
  requireWritableDatabase,
} from "../middleware/database.js";
import * as controller from "../controllers/orders.controller.js";

const r = Router();
r.use(auth, requireDatabase);
r.post("/", controller.createOrder);
r.get("/mine", controller.listMyOrders);
r.get("/", admin, controller.listOrders);
r.get("/:id", controller.getMyOrder);
r.patch("/:id/status", admin, requireWritableDatabase, controller.updateStatus);
r.patch("/:id/cancel", requireWritableDatabase, controller.updateStatus);
export default r;
