import { Router } from "express";
import { auth, admin } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import * as controller from "../controllers/orders.controller.js";

const r = Router();
r.use(auth, requireDatabase);
r.post("/", controller.createOrder);
r.get("/mine", controller.listMyOrders);
r.get("/", admin, controller.listOrders);
r.patch("/:id/status", admin, controller.updateStatus);
r.patch("/:id/cancel", controller.updateStatus);
export default r;
