import { Router } from "express";
import * as controller from "../controllers/diamonds.controller.js";

const r = Router();
r.get("/", controller.listDiamonds);
r.post("/rank", controller.rankDiamondsForRequest);
export default r;
