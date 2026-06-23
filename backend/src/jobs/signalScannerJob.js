import Candle15m from "../models/Candle15m.js";
import Signal from "../models/Signal.js";

import signalEngine from "../services/analysis/signalEngine.js";

import createTrade from "../services/trade/createTrade.js";

const signalScannerJob = async () => {
  try {
    const candles =
      await Candle15m.find()
        .sort({
          openTime: 1,
        })
        .limit(500);

    if (!candles.length) {
      console.log(
        "❌ No candles found"
      );
      return;
    }

    const result =
      signalEngine(candles);

    console.log(
      "========================"
    );

    console.log(
      "SIGNAL ENGINE RESULT"
    );

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    console.log(
      "========================"
    );

    if (
      result.signal ===
      "NONE"
    ) {
      console.log(
        "❌ No valid signal"
      );
      return;
    }

    const current =
      candles[
        candles.length - 1
      ];

    const existingSignal =
      await Signal.findOne({
        candleTime:
          current.openTime,
      });

    if (
      existingSignal
    ) {
      console.log(
        "⚠️ Signal already saved"
      );
      return;
    }

    const savedSignal =
      await Signal.create({
        signal:
          result.signal,

        score:
          result.score,

        entry:
          result.entry,

        stopLoss:
          result.stopLoss,

        takeProfit1:
          result.takeProfit1,

        takeProfit2:
          result.takeProfit2,

        trend:
          result.structure
            .trend,

        candleTime:
          current.openTime,
      });

    console.log(
      "✅ Signal Saved"
    );

    console.log(
      savedSignal
    );

    await createTrade(
      result
    );

    console.log(
      "✅ Trade Created"
    );
  } catch (error) {
    console.error(
      "SIGNAL SCANNER ERROR:"
    );

    console.error(
      error
    );
  }
};

export default signalScannerJob;