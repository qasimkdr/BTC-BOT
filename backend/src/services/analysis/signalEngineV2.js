import getMarketStructure from "./marketStructure.js";
import detectLiquidityGrab from "./liquidityGrab.js";
import volumeAnalysis from "./volumeAnalysis.js";
import sessionFilter from "./sessionFilter.js";
import calculateEMA from "./ema.js";
import calculateATR from "./atr.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const calculateRSI = (candles, period = 14) => {
  if (!candles || candles.length < period + 1) return 50;

  const slice = candles.slice(-(period + 1));
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < slice.length; i++) {
    const change = slice[i].close - slice[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const signalEngineV2 = (candles) => {
  if (!candles || candles.length < 260) {
    return {
      signal: "NONE",
      score: 0,
      buyPressure: 50,
      sellPressure: 50,
      strategyVersion: "v2-accuracy-candidate",
    };
  }

  // Only the recent history is needed for feature calculations and keeps backtests fast.
  const recent = candles.slice(-320);
  const current = recent[recent.length - 1];
  const previous = recent[recent.length - 2];

  const structure = getMarketStructure(recent);
  const liquidity = detectLiquidityGrab(recent);
  const volume = volumeAnalysis(recent);
  const session = sessionFilter(current.openTime);
  const ema200 = calculateEMA(recent, 200);
  const ema50 = calculateEMA(recent, 50);
  const atr = calculateATR(recent);
  const rsi = calculateRSI(recent, 14);

  const emaSlopeLookback = recent.slice(0, -12);
  const ema200Past = emaSlopeLookback.length >= 200
    ? calculateEMA(emaSlopeLookback, 200)
    : ema200;

  const emaSlopeAtr = atr > 0 ? (ema200 - ema200Past) / atr : 0;
  const emaDistanceAtr = atr > 0 ? (current.close - ema200) / atr : 0;

  const range = Math.max(current.high - current.low, Number.EPSILON);
  const body = Math.abs(current.close - current.open);
  const bodyRatio = body / range;
  const closeLocation = (current.close - current.low) / range;

  const bullishCandle = current.close > current.open;
  const bearishCandle = current.close < current.open;
  const previousBullish = previous.close > previous.open;
  const previousBearish = previous.close < previous.open;

  const bullishEMA = current.close > ema200 && ema50 > ema200;
  const bearishEMA = current.close < ema200 && ema50 < ema200;

  const bullishSlope = emaSlopeAtr > 0.025;
  const bearishSlope = emaSlopeAtr < -0.025;

  // Avoid entering after price has already stretched too far from the trend anchor.
  const buyDistanceOk = emaDistanceAtr >= 0.15 && emaDistanceAtr <= 2.25;
  const sellDistanceOk = emaDistanceAtr <= -0.15 && emaDistanceAtr >= -2.25;

  // Require the setup candle itself to confirm direction rather than using volume alone.
  const buyCandleQuality =
    bullishCandle &&
    bodyRatio >= 0.38 &&
    closeLocation >= 0.62;

  const sellCandleQuality =
    bearishCandle &&
    bodyRatio >= 0.38 &&
    closeLocation <= 0.38;

  const strongVolume = volume.ratio >= 1.35;

  // Momentum zones reject weak trends and very stretched entries.
  const buyMomentum = rsi >= 53 && rsi <= 69;
  const sellMomentum = rsi <= 47 && rsi >= 31;

  const buyStructure =
    structure.trend === "bullish" &&
    structure.choch !== "bearish";

  const sellStructure =
    structure.trend === "bearish" &&
    structure.choch !== "bullish";

  const buyLiquidity =
    !liquidity.detected || liquidity.type === "bullish";

  const sellLiquidity =
    !liquidity.detected || liquidity.type === "bearish";

  // A BOS is a bonus, not mandatory, because the swing detector confirms with delay.
  const buyBosBonus = structure.bos === "bullish";
  const sellBosBonus = structure.bos === "bearish";

  let buyScore = 0;
  let sellScore = 0;

  if (buyStructure) buyScore += 20;
  if (bullishEMA) buyScore += 18;
  if (bullishSlope) buyScore += 12;
  if (strongVolume) buyScore += 14;
  if (buyCandleQuality) buyScore += 14;
  if (buyMomentum) buyScore += 10;
  if (buyDistanceOk) buyScore += 7;
  if (buyLiquidity) buyScore += 3;
  if (buyBosBonus) buyScore += 2;

  if (sellStructure) sellScore += 20;
  if (bearishEMA) sellScore += 18;
  if (bearishSlope) sellScore += 12;
  if (strongVolume) sellScore += 14;
  if (sellCandleQuality) sellScore += 14;
  if (sellMomentum) sellScore += 10;
  if (sellDistanceOk) sellScore += 7;
  if (sellLiquidity) sellScore += 3;
  if (sellBosBonus) sellScore += 2;

  buyScore = clamp(buyScore, 0, 100);
  sellScore = clamp(sellScore, 0, 100);

  // Accuracy mode: all core filters must agree. This should reduce trade count materially.
  const canBuy =
    session.validTradingTime &&
    buyStructure &&
    bullishEMA &&
    bullishSlope &&
    strongVolume &&
    buyCandleQuality &&
    buyMomentum &&
    buyDistanceOk &&
    buyLiquidity &&
    buyScore >= 88;

  const canSell =
    session.validTradingTime &&
    sellStructure &&
    bearishEMA &&
    bearishSlope &&
    strongVolume &&
    sellCandleQuality &&
    sellMomentum &&
    sellDistanceOk &&
    sellLiquidity &&
    sellScore >= 88;

  let signal = "NONE";
  let entry = null;
  let stopLoss = null;
  let takeProfit1 = null;
  let takeProfit2 = null;

  if (canBuy) {
    signal = "BUY";
    entry = current.close - atr * 0.2;
    stopLoss = entry - atr * 2.2;
    const risk = entry - stopLoss;
    takeProfit1 = entry + risk;
    takeProfit2 = entry + risk * 2;
  } else if (canSell) {
    signal = "SELL";
    entry = current.close + atr * 0.2;
    stopLoss = entry + atr * 2.2;
    const risk = stopLoss - entry;
    takeProfit1 = entry - risk;
    takeProfit2 = entry - risk * 2;
  }

  const totalScore = buyScore + sellScore;
  const buyPressure = totalScore ? Math.round((buyScore / totalScore) * 100) : 50;
  const sellPressure = 100 - buyPressure;

  return {
    strategyVersion: "v2-accuracy-candidate",
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
    liquidity,
    volume,
    session,
    ema200,
    ema50,
    atr,
    rsi,
    emaSlopeAtr,
    emaDistanceAtr,
    bodyRatio,
    reasons: {
      buyStructure,
      sellStructure,
      bullishEMA,
      bearishEMA,
      bullishSlope,
      bearishSlope,
      strongVolume,
      buyCandleQuality,
      sellCandleQuality,
      buyMomentum,
      sellMomentum,
      buyDistanceOk,
      sellDistanceOk,
      buyLiquidity,
      sellLiquidity,
      buyBosBonus,
      sellBosBonus,
      previousBullish,
      previousBearish,
      rsi,
      emaSlopeAtr,
      emaDistanceAtr,
      volumeRatio: volume.ratio,
      session: session.validTradingTime,
      canBuy,
      canSell,
    },
  };
};

export default signalEngineV2;
