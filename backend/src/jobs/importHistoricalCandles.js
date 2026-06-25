import axios from "axios";
import dotenv from "dotenv";

import connectDB from "../config/db.js";
import Candle15m from "../models/Candle15m.js";

dotenv.config();

const importLast5Days = async () => {
  try {
    await connectDB();

    const FIVE_DAYS =
      5 * 24 * 60 * 60 * 1000;

    const startTime =
      Date.now() - FIVE_DAYS;

    const response =
      await axios.get(
        "https://api.binance.com/api/v3/klines",
        {
          params: {
            symbol: "BTCUSDT",
            interval: "15m",
            startTime,
            limit: 1000,
          },
        }
      );

    const candles =
      response.data;

    let inserted = 0;
    let skipped = 0;

    for (const c of candles) {
      const exists =
        await Candle15m.findOne({
          openTime: c[0],
        });

      if (exists) {
        skipped++;
        continue;
      }

      await Candle15m.create({
        symbol: "BTCUSDT",

        openTime: c[0],

        open: Number(c[1]),

        high: Number(c[2]),

        low: Number(c[3]),

        close: Number(c[4]),

        volume: Number(c[5]),

        closeTime: c[6],
      });

      inserted++;
    }

    console.log(
      `✅ Inserted: ${inserted}`
    );

    console.log(
      `⏭️ Skipped Existing: ${skipped}`
    );

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

importLast5Days();