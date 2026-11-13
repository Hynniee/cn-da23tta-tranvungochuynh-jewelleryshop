import { Router } from "express";
import { auth, admin } from "../middleware/auth.js";
import * as controller from "../controllers/products.controller.js";
import { requireWritableDatabase } from "../middleware/database.js";

const r = Router();
r.get("/", controller.listProducts);
r.post("/write-status", auth, admin, requireWritableDatabase, (_req, res) =>
  res.json({ writable: true }),
);
r.get("/:slug", controller.getProduct);
r.post("/", auth, admin, requireWritableDatabase, controller.createProduct);
r.put("/:id", auth, admin, requireWritableDatabase, controller.updateProduct);
r.delete(
  "/:id",
  auth,
  admin,
  requireWritableDatabase,
  controller.deleteProduct,
);
export default r;
