import express from "express";

import {
  testSignal,
  getSignalHistory,
} from "../controllers/signalController.js";

const router =
  express.Router();


router.get(
  "/current",
  testSignal
);

router.get(
  "/history",
  getSignalHistory
);

export default router;