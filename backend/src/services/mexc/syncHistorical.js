import fetchCandles from "./fetchCandles.js";
import Candle15m from "../../models/Candle15m.js";

const syncHistorical = async () => {
  try {
    const candles = await fetchCandles(
      "BTCUSDT",
      "15m",
      1000
    );

    let inserted = 0;

    for (const candle of candles) {
      const exists =
        await Candle15m.findOne({
          openTime: candle[0],
        });

      if (exists) continue;

      await Candle15m.create({
        symbol: "BTCUSDT",

        openTime: candle[0],

        open: Number(candle[1]),

        high: Number(candle[2]),

        low: Number(candle[3]),

        close: Number(candle[4]),

        volume: Number(candle[5]),

        closeTime: candle[6],
      });

      inserted++;
    }

    console.log(
      `✅ Imported ${inserted} candles`
    );
  } catch (error) {
    console.error(error);
  }
};

export default syncHistorical;