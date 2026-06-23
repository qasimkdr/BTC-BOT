import express from "express";

import {
  getTrades,
  getActiveTrade,
} from "../controllers/tradeController.js";

const router =
  express.Router();

router.get(
  "/",
  getTrades
);

router.get(
  "/active",
  getActiveTrade
);

export default router;