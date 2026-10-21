import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import * as controller from "../controllers/payments.controller.js";

const r = Router();
r.get("/options", controller.getPaymentOptions);
r.use(requireDatabase);
r.post("/create/:orderId", auth, controller.createPayment);
r.get("/order/:orderId", auth, controller.getOrderPayment);
r.post("/webhook", controller.handleWebhook);
export default r;
