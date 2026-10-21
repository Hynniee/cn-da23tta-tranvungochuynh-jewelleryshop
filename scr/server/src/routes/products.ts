import { Router } from "express";
import { auth, admin } from "../middleware/auth.js";
import * as controller from "../controllers/products.controller.js";

const r = Router();
r.get("/", controller.listProducts);
r.get("/:slug", controller.getProduct);
r.post("/", auth, admin, controller.createProduct);
r.put("/:id", auth, admin, controller.updateProduct);
r.delete("/:id", auth, admin, controller.deleteProduct);
export default r;
