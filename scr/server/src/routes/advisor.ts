import { requireDatabase } from "../middleware/database.js";
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import * as controller from "../controllers/advisor.controller.js";

const r = Router();
r.use(requireDatabase);
r.post("/", auth, controller.advise);
export default r;
