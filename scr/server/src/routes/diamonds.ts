import { Router } from "express";
import * as controller from "../controllers/diamonds.controller.js";

const r = Router();
r.get("/", controller.listDiamonds);
r.post("/rank", controller.rankDiamondsForRequest);
r.get("/:id", controller.getDiamond);
export default r;
