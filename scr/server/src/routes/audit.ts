import { requireDatabase } from "../middleware/database.js";
import { Router } from "express";
import { auth, allow } from "../middleware/auth.js";
import * as controller from "../controllers/audit.controller.js";

const r = Router();
r.use(requireDatabase);
r.get("/", auth, allow("admin", "manager"), controller.listAuditLogs);
export default r;
