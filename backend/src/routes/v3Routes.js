import express from "express";
import { runV3Shadow, getV3Status, getV3Decisions } from "../controllers/v3Controller.js";

const router = express.Router();
router.get("/status", getV3Status);
router.get("/decisions", getV3Decisions);
router.post("/shadow/run", runV3Shadow);
export default router;
