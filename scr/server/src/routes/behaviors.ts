import { requireDatabase } from "../middleware/database.js";
import { Router } from "express";
import { optionalAuth, auth } from "../middleware/auth.js";
import * as controller from "../controllers/behaviors.controller.js";

const r = Router();
r.use(requireDatabase);
r.post("/", optionalAuth, controller.recordBehavior);
r.get("/preference", auth, controller.getPreference);
export default r;
