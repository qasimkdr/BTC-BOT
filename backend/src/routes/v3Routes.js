import express from "express";
import { runV3Shadow, getV3Status, getV3Decisions, getV3PerformanceStats } from "../controllers/v3Controller.js";

const router = express.Router();
router.get("/status", getV3Status);
router.get("/decisions", getV3Decisions);
router.get("/performance", getV3PerformanceStats);
router.post("/shadow/run", runV3Shadow);
export default router;
