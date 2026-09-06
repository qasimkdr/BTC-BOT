import express from "express";

import {
  getTrades,
  getActiveTrade,
  exportTrades,
} from "../controllers/tradeController.js";

const router = express.Router();

router.get("/", getTrades);
router.get("/active", getActiveTrade);
router.get("/export", exportTrades);

export default router;
