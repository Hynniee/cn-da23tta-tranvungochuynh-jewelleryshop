import { Router } from "express";
import { auth } from "../middleware/auth.js";
import * as controller from "../controllers/recommendations.controller.js";

const r = Router();
r.get("/ml-status", controller.getMLStatus);
r.get("/public", controller.getPublicRecommendations);
r.get("/demo", controller.getPublicRecommendations);
r.get("/", auth, controller.getRecommendations);
r.post("/:id/feedback", auth, controller.saveFeedback);
export default r;
