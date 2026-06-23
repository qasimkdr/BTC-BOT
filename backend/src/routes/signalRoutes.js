import express from "express";

import {
  testSignal,
  getSignalHistory,
  getCurrentSignal,
} from "../controllers/signalController.js";

const router =
  express.Router();

router.get(
  "/current",
  getCurrentSignal
);

router.get(
  "/test",
  testSignal
);

router.get(
  "/history",
  getSignalHistory
);

export default router;
