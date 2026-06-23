import getMarketStructure from "./marketStructure.js";
import detectLiquidityGrab from "./liquidityGrab.js";
import volumeAnalysis from "./volumeAnalysis.js";
import sessionFilter from "./sessionFilter.js";
import confidenceScore from "./confidenceScore.js";
import calculateEMA from "./ema.js";
import calculateATR from "./atr.js";

const signalEngine = (
  candles
) => {
  if (
    !candles ||
    candles.length < 250
  ) {
    return {
      signal: "NONE",
    };
  }

  const structure =
    getMarketStructure(
      candles
    );

  const liquidity =
    detectLiquidityGrab(
      candles
    );

  const volume =
    volumeAnalysis(
      candles
    );

  const current =
    candles[
      candles.length - 1
    ];

  const session =
    sessionFilter(
      current.openTime
    );

  const score =
    confidenceScore({
      trend:
        structure.trend,
      liquidity,
      volume,
      session,
    });

  const ema200 =
    calculateEMA(
      candles,
      200
    );

  const atr =
    calculateATR(
      candles
    );

  const bullishEMA =
    current.close >
    ema200;

  const bearishEMA =
    current.close <
    ema200;

  let signal =
    "NONE";

  let entry =
    null;

  let stopLoss =
    null;

  let takeProfit1 =
    null;

  let takeProfit2 =
    null;

  console.log({
    trend:
      structure.trend,

    bos:
      structure.bos,

    choch:
      structure.choch,

    ema200,

    atr,

    bullishEMA,

    bearishEMA,

    liquidity:
      liquidity.detected,

    liquidityType:
      liquidity.type,

    volumeSpike:
      volume.volumeSpike,

    session:
      session.validTradingTime,

    score,
  });

  // BUY
  if (
  structure.trend === "bullish" &&
  bullishEMA &&
  volume.volumeSpike &&
  session.validTradingTime &&
  (
    !liquidity.detected ||
    liquidity.type === "bullish"
  )
) {
    signal = "BUY";

    // RETEST ENTRY
    entry =
      current.close -
      atr * 0.3;

    stopLoss =
      entry -
      atr * 2.5;

    const risk =
      entry -
      stopLoss;

    takeProfit1 =
      entry +
      risk;

    takeProfit2 =
      entry +
      risk * 2;
  }

  // SELL
  else if (
  structure.trend === "bearish" &&
  bearishEMA &&
  volume.volumeSpike &&
  session.validTradingTime &&
  (
    !liquidity.detected ||
    liquidity.type === "bearish"
  )
) {
    signal = "SELL";

    // RETEST ENTRY
    entry =
      current.close +
      atr * 0.3;

    stopLoss =
      entry +
      atr * 2.5;

    const risk =
      Math.abs(
        stopLoss -
          entry
      );

    takeProfit1 =
      entry -
      risk;

    takeProfit2 =
      entry -
      risk * 2;
  }

  return {
  signal,

  score,

  entry,

  stopLoss,

  takeProfit1,

  takeProfit2,

  structure,

  liquidity,

  volume,

  session,

  ema200,

  atr,

  reasons: {
    bullishEMA,

    bearishEMA,

    liquidity:
      liquidity.detected,

    liquidityType:
      liquidity.type,

    volumeSpike:
      volume.volumeSpike,

    volumeRatio:
      volume.ratio,

    session:
      session.validTradingTime,
  },
};
};

export default signalEngine;