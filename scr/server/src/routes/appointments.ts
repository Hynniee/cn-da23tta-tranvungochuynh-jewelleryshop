import { Router } from "express";
import { requireDatabase } from "../middleware/database.js";
import * as controller from "../controllers/appointments.controller.js";

const router = Router();
router.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});
router.use(requireDatabase);
router.post("/", controller.createAppointment);
router.get("/:code", controller.getAppointment);
router.post("/:code/email", controller.resendConfirmation);
export default router;
