import getMarketStructureV3 from "./marketStructureV3.js";
import detectLiquidityGrabV3 from "./liquidityGrabV3.js";
import volumeAnalysisV3 from "./volumeAnalysisV3.js";
import sessionFilter from "./sessionFilter.js";
import {
  aggregateCandles,
  calculateEMAStandard,
  calculateWilderATR,
  calculateWilderRSI,
} from "./indicatorUtilsV3.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const signalEngineV3 = (candles) => {
  if (!candles || candles.length < 320) {
    return {
      signal: "NONE",
      score: 0,
      buyPressure: 50,
      sellPressure: 50,
      strategyVersion: "v3-enhanced-research",
    };
  }

  const recent = candles.slice(-640);
  const current = recent.at(-1);
  const atr = calculateWilderATR(recent, 14);
  const ema50 = calculateEMAStandard(recent, 50);
  const ema200 = calculateEMAStandard(recent, 200);
  const rsi = calculateWilderRSI(recent, 14);
  const structure = getMarketStructureV3(recent);
  const volume = volumeAnalysisV3(recent, 20);
  const liquidity = detectLiquidityGrabV3(recent, structure, atr);
  const session = sessionFilter(current.openTime);

  const oneHour = aggregateCandles(recent, 4);
  const structure1h = getMarketStructureV3(oneHour);
  const ema50_1h = calculateEMAStandard(oneHour, 50);
  const ema200_1h = calculateEMAStandard(oneHour, 200);

  const bullish1h =
    ["bullish", "bullish-transition"].includes(structure1h.trend) &&
    ema50_1h != null && ema200_1h != null && ema50_1h > ema200_1h;

  const bearish1h =
    ["bearish", "bearish-transition"].includes(structure1h.trend) &&
    ema50_1h != null && ema200_1h != null && ema50_1h < ema200_1h;

  const emaDistanceAtr = atr > 0 ? (current.close - ema200) / atr : 0;
  const ema50DistanceAtr = atr > 0 ? (current.close - ema50) / atr : 0;
  const atrPct = current.close > 0 ? (atr / current.close) * 100 : 0;

  const bullishTrend = ["bullish", "bullish-transition"].includes(structure.trend);
  const bearishTrend = ["bearish", "bearish-transition"].includes(structure.trend);
  const bullishEMA = current.close > ema200 && ema50 > ema200;
  const bearishEMA = current.close < ema200 && ema50 < ema200;
  const bullishVolume = volume.volumeSpike && volume.directionalBias !== "bearish";
  const bearishVolume = volume.volumeSpike && volume.directionalBias !== "bullish";
  const bullishMomentum = rsi >= 48 && rsi <= 68;
  const bearishMomentum = rsi <= 52 && rsi >= 32;
  const bullishLiquidity = !liquidity.detected || liquidity.type === "bullish";
  const bearishLiquidity = !liquidity.detected || liquidity.type === "bearish";
  const notChasingBuy = ema50DistanceAtr >= -0.4 && ema50DistanceAtr <= 2.0;
  const notChasingSell = ema50DistanceAtr <= 0.4 && ema50DistanceAtr >= -2.0;
  const volatilityOk = atrPct >= 0.12 && atrPct <= 2.5;

  let buyScore = 0;
  let sellScore = 0;

  if (bullishTrend) buyScore += 18;
  if (bullishEMA) buyScore += 14;
  if (bullish1h) buyScore += 20;
  if (bullishVolume) buyScore += 12;
  if (bullishMomentum) buyScore += 8;
  if (bullishLiquidity) buyScore += 8;
  if (liquidity.detected && liquidity.type === "bullish") buyScore += Math.min(8, liquidity.quality / 12.5);
  if (structure.bos === "bullish") buyScore += 7;
  if (structure.choch === "bullish") buyScore += 4;
  if (notChasingBuy) buyScore += 5;
  if (volatilityOk) buyScore += 4;

  if (bearishTrend) sellScore += 18;
  if (bearishEMA) sellScore += 14;
  if (bearish1h) sellScore += 20;
  if (bearishVolume) sellScore += 12;
  if (bearishMomentum) sellScore += 8;
  if (bearishLiquidity) sellScore += 8;
  if (liquidity.detected && liquidity.type === "bearish") sellScore += Math.min(8, liquidity.quality / 12.5);
  if (structure.bos === "bearish") sellScore += 7;
  if (structure.choch === "bearish") sellScore += 4;
  if (notChasingSell) sellScore += 5;
  if (volatilityOk) sellScore += 4;

  buyScore = clamp(Math.round(buyScore), 0, 100);
  sellScore = clamp(Math.round(sellScore), 0, 100);

  // Core alignment is mandatory; the rest contributes through weighted confirmation.
  const canBuy =
    session.validTradingTime &&
    bullishTrend &&
    bullishEMA &&
    bullish1h &&
    bullishVolume &&
    bullishLiquidity &&
    notChasingBuy &&
    volatilityOk &&
    buyScore >= 72;

  const canSell =
    session.validTradingTime &&
    bearishTrend &&
    bearishEMA &&
    bearish1h &&
    bearishVolume &&
    bearishLiquidity &&
    notChasingSell &&
    volatilityOk &&
    sellScore >= 72;

  let signal = "NONE";
  let entry = null;
  let stopLoss = null;
  let takeProfit1 = null;
  let takeProfit2 = null;

  if (canBuy) {
    signal = "BUY";
    entry = current.close - atr * 0.25;
    stopLoss = entry - atr * 2.3;
    const risk = entry - stopLoss;
    takeProfit1 = entry + risk;
    takeProfit2 = entry + risk * 2;
  } else if (canSell) {
    signal = "SELL";
    entry = current.close + atr * 0.25;
    stopLoss = entry + atr * 2.3;
    const risk = stopLoss - entry;
    takeProfit1 = entry - risk;
    takeProfit2 = entry - risk * 2;
  }

  const total = buyScore + sellScore;
  const buyPressure = total ? Math.round((buyScore / total) * 100) : 50;
  const sellPressure = 100 - buyPressure;

  return {
    strategyVersion: "v3-enhanced-research",
    signal,
    score: signal === "BUY" ? buyScore : signal === "SELL" ? sellScore : Math.max(buyScore, sellScore),
    buyScore,
    sellScore,
    buyPressure,
    sellPressure,
    currentPrice: current.close,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    structure,
    structure1h,
    liquidity,
    volume,
    session,
    ema50,
    ema200,
    ema50_1h,
    ema200_1h,
    atr,
    atrPct,
    rsi,
    emaDistanceAtr,
    ema50DistanceAtr,
    reasons: {
      bullishTrend,
      bearishTrend,
      bullishEMA,
      bearishEMA,
      bullish1h,
      bearish1h,
      bullishVolume,
      bearishVolume,
      bullishMomentum,
      bearishMomentum,
      bullishLiquidity,
      bearishLiquidity,
      notChasingBuy,
      notChasingSell,
      volatilityOk,
      bos: structure.bos,
      choch: structure.choch,
      regime: structure.regime,
      regime1h: structure1h.regime,
      rsi,
      atrPct,
      volumeRatio: volume.ratio,
      volumeBias: volume.directionalBias,
      liquidityQuality: liquidity.quality || 0,
      canBuy,
      canSell,
    },
  };
};

export default signalEngineV3;
