import Candle15m from "../models/Candle15m.js";
import Signal from "../models/Signal.js";

import signalEngine from "../services/analysis/signalEngine.js";

import createTrade from "../services/trade/createTrade.js";

const signalScannerJob = async () => {
  try {
    const candles = await Candle15m.find()
  .sort({ openTime: -1 })
  .limit(500);

candles.reverse();

    if (!candles.length) {
      console.log(
        "❌ No candles found"
      );
      return;
    }

    const result =
      signalEngine(candles);

      console.log("=================================");
console.log(
  "CANDLE:",
  new Date(
    candles[candles.length - 1].openTime
  ).toLocaleString()
);

console.log("SIGNAL:", result.signal);
console.log("SCORE:", result.score);

console.log({
  trend: result.structure?.trend,
  bullishEMA: result.reasons?.bullishEMA,
  bearishEMA: result.reasons?.bearishEMA,
  volumeSpike: result.reasons?.volumeSpike,
  liquidity: result.liquidity?.detected,
  liquidityType: result.liquidity?.type,
  session: result.session?.validTradingTime,
});


    

    


    if (
  result.signal === "NONE"
) {
  console.log(
    "❌ No trade on this candle"
  );
  return;
} {
  console.log(
    "TRADE REJECTED",
    {
      signal: result.signal,
      score: result.score,
    }
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