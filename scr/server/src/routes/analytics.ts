import { requireDatabase } from "../middleware/database.js";
import { Router } from "express";
import { auth, allow } from "../middleware/auth.js";
import * as controller from "../controllers/analytics.controller.js";

const r = Router();
r.use(requireDatabase);
r.get("/", auth, allow("admin", "manager"), controller.getAnalytics);
export default r;
