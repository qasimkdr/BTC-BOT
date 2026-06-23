import axios from "axios";
import dotenv from "dotenv";

import connectDB from "../config/db.js";
import Candle15m from "../models/Candle15m.js";

dotenv.config();

const importCandles = async () => {
  try {
    await connectDB();

    const TOTAL_CANDLES = 10000;
    const LIMIT = 1000;

    let inserted = 0;

    let endTime = Date.now();

    while (inserted < TOTAL_CANDLES) {
      const response =
        await axios.get(
          "https://api.binance.com/api/v3/klines",
          {
            params: {
              symbol:
                "BTCUSDT",
              interval:
                "15m",
              limit: LIMIT,
              endTime,
            },
          }
        );

      const candles =
        response.data;

      if (
        !candles ||
        candles.length === 0
      ) {
        break;
      }

      for (const c of candles) {
        const exists =
          await Candle15m.findOne(
            {
              openTime:
                c[0],
            }
          );

        if (exists) {
          continue;
        }

        await Candle15m.create(
          {
            symbol:
              "BTCUSDT",

            openTime:
              c[0],

            open:
              Number(
                c[1]
              ),

            high:
              Number(
                c[2]
              ),

            low:
              Number(
                c[3]
              ),

            close:
              Number(
                c[4]
              ),

            volume:
              Number(
                c[5]
              ),

            closeTime:
              c[6],
          }
        );

        inserted++;
      }

      console.log(
        `Imported: ${inserted}/${TOTAL_CANDLES}`
      );

      endTime =
        candles[0][0] - 1;

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            300
          )
      );
    }

    console.log(
      `✅ Finished importing ${inserted} candles`
    );

    process.exit(0);
  } catch (error) {
    console.error(
      error.message
    );

    process.exit(1);
  }
};

importCandles();