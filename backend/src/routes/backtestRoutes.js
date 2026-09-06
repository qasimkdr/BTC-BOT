import express from "express";
import { runBacktest } from "../controllers/backtestController.js";
import { runBacktestValidation } from "../controllers/backtestValidationController.js";
import { runWalkForward } from "../controllers/walkForwardController.js";
import { compareManagementPlans } from "../controllers/managementComparisonController.js";

const router = express.Router();
router.get("/", runBacktest);
router.get("/validate", runBacktestValidation);
router.get("/walk-forward", runWalkForward);
router.get("/management", compareManagementPlans);
export default router;
