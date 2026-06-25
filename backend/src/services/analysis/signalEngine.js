import getMarketStructure from "./marketStructure.js";
import detectLiquidityGrab from "./liquidityGrab.js";
import volumeAnalysis from "./volumeAnalysis.js";
import sessionFilter from "./sessionFilter.js";
import confidenceScore from "./confidenceScore.js";
import calculateEMA from "./ema.js";
import calculateATR from "./atr.js";

const signalEngine = (candles) => {
  if (!candles || candles.length < 250) {
    return {
      signal: "NONE",
      score: 0,
    };
  }

  const structure =
    getMarketStructure(candles);

  const liquidity =
    detectLiquidityGrab(candles);

  const volume =
    volumeAnalysis(candles);

  const current =
    candles[candles.length - 1];

  const session =
    sessionFilter(
      current.openTime
    );

  const ema200 =
    calculateEMA(
      candles,
      200
    );

  const atr =
    calculateATR(candles);

  const bullishEMA =
    current.close > ema200;

  const bearishEMA =
    current.close < ema200;

  const score =
    confidenceScore({
      trend: structure.trend,
      liquidity,
      volume,
      session,
    });

  let signal = "NONE";

  let entry = null;
  let stopLoss = null;
  let takeProfit1 = null;
  let takeProfit2 = null;

  const canBuy =
    score >= 50 &&
    session.validTradingTime &&
    structure.trend ===
      "bullish" &&
    bullishEMA &&
    volume.volumeSpike &&
    (
      !liquidity.detected ||
      liquidity.type ===
        "bullish"
    );

  const canSell =
    score >= 50 &&
    session.validTradingTime &&
    structure.trend ===
      "bearish" &&
    bearishEMA &&
    volume.volumeSpike &&
    (
      !liquidity.detected ||
      liquidity.type ===
        "bearish"
    );

  if (canBuy) {
    signal = "BUY";

    entry =
      current.close -
      atr * 0.3;

    stopLoss =
      entry -
      atr * 2.5;

    const risk =
      entry - stopLoss;

    takeProfit1 =
      entry + risk;

    takeProfit2 =
      entry + risk * 2;
  }

  else if (canSell) {
    signal = "SELL";

    entry =
      current.close +
      atr * 0.3;

    stopLoss =
      entry +
      atr * 2.5;

    const risk =
      stopLoss - entry;

    takeProfit1 =
      entry - risk;

    takeProfit2 =
      entry - risk * 2;
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
      trend:
        structure.trend,

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

      canBuy,

      canSell,
    },
  };
};

export default signalEngine;