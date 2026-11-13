import {
  requireDatabase,
  requireWritableDatabase,
} from "../middleware/database.js";
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import * as controller from "../controllers/auth.controller.js";
import * as addresses from "../controllers/addresses.controller.js";

const r = Router();
r.use(requireDatabase);
r.post("/register", controller.register);
r.post("/login", controller.login);
r.get("/me", auth, controller.getProfile);
r.patch("/me", auth, controller.updateProfile);
r.get("/me/addresses", auth, addresses.listAddresses);
r.post("/me/addresses", auth, requireWritableDatabase, addresses.createAddress);
r.patch(
  "/me/addresses/:id/default",
  auth,
  requireWritableDatabase,
  addresses.setDefaultAddress,
);
r.patch(
  "/me/addresses/:id",
  auth,
  requireWritableDatabase,
  addresses.updateAddress,
);
r.delete(
  "/me/addresses/:id",
  auth,
  requireWritableDatabase,
  addresses.deleteAddress,
);
export default r;
