import { requireDatabase } from "../middleware/database.js";
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import * as controller from "../controllers/auth.controller.js";

const r = Router();
r.use(requireDatabase);
r.post("/register", controller.register);
r.post("/login", controller.login);
r.get("/me", auth, controller.getProfile);
r.patch("/me", auth, controller.updateProfile);
export default r;
