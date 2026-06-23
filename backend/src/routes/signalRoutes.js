import express from "express";

import {
  testSignal,
  getSignalHistory,
} from "../controllers/signalController.js";

const router =
  express.Router();

router.get(
  "/test",
  testSignal
);

router.get(
  "/history",
  getSignalHistory
);

router.get(
  "/current",
  getCurrentSignal
);

export default router;