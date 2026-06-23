import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import syncHistorical from "../services/mexc/syncHistorical.js";

const run = async () => {
  await connectDB();

  await syncHistorical();

  process.exit();
};

run();