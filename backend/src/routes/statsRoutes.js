import express from "express";
import { getStats, getV2LiveStats } from "../controllers/statsController.js";

const router = express.Router();
router.get("/", getStats);
router.get("/v2-live", getV2LiveStats);
export default router;
