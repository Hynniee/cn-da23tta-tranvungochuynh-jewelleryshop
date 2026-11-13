import { Router } from "express";
import { auth, admin } from "../middleware/auth.js";
import {
  requireDatabase,
  requireWritableDatabase,
} from "../middleware/database.js";
import {
  listCustomers,
  customerDetail,
  updateCustomer,
} from "../controllers/customers.controller.js";
const router = Router();
router.use(requireDatabase, auth, admin);
router.get("/", listCustomers);
router.get("/:id", customerDetail);
router.patch("/:id", requireWritableDatabase, updateCustomer);
export default router;
