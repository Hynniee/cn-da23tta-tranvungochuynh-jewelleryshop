import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import * as controller from "../controllers/assistant.controller.js";

const r = Router();
r.post("/", optionalAuth, controller.chat);
export default r;
