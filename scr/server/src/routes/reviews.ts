import { Router } from "express";
import { auth, optionalAuth } from "../middleware/auth.js";
import { requireDatabase } from "../middleware/database.js";
import * as controller from "../controllers/reviews.controller.js";

const r = Router({ mergeParams: true });
r.get("/", optionalAuth, controller.listReviews);
r.post("/", auth, requireDatabase, controller.createReview);
export default r;
