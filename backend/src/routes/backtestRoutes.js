import express from "express";

import {
  runBacktest,
} from "../controllers/backtestController.js";

const router =
  express.Router();

router.get(
  "/",
  runBacktest
);

export default router;