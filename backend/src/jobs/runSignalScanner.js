import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import signalScannerJob from "./signalScannerJob.js";

const run = async () => {
  try {
    await connectDB();

    await signalScannerJob();

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

run();