import { Router } from "express";
import { auth, admin } from "../middleware/auth.js";
import {
  requireDatabase,
  requireWritableDatabase,
} from "../middleware/database.js";
import * as controller from "../controllers/promotions.controller.js";
const router = Router();
router.use(requireDatabase);
router.post("/quote", controller.quote);
router.use(auth, admin);
router.get("/", controller.list);
router.post("/", requireWritableDatabase, controller.create);
router.put("/:id", requireWritableDatabase, controller.update);
router.patch("/:id/active", requireWritableDatabase, controller.toggle);
export default router;
