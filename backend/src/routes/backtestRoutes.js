import express from "express";
import { runBacktest } from "../controllers/backtestController.js";
import { runBacktestValidation } from "../controllers/backtestValidationController.js";

const router = express.Router();

router.get("/", runBacktest);
router.get("/validate", runBacktestValidation);

export default router;
