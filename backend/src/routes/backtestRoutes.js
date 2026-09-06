import express from "express";

import {
  runBacktest,
} from "../controllers/backtestController.js";
import {
  runBacktestV1,
} from "../controllers/backtestV1Controller.js";
import {
  runBacktestV3,
} from "../controllers/backtestV3Controller.js";

const router = express.Router();

router.get("/", runBacktest);
router.get("/v1", runBacktestV1);
router.get("/v3", runBacktestV3);

export default router;
