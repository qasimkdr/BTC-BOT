import Candle15m from "../../models/Candle15m.js";
import Candle1h from "../../models/Candle1h.js";
import Candle4h from "../../models/Candle4h.js";
import { calculateEMAStandard, calculateWilderATR, calculateWilderRSI } from "../analysis/indicatorUtilsV3.js";

const frame = (candles) => {
  if (!candles?.length) return null;
  const ordered = [...candles].sort((a,b) => a.openTime - b.openTime);
  const last = ordered.at(-1);
  const ema50 = calculateEMAStandard(ordered, 50);
  const ema200 = calculateEMAStandard(ordered, 200);
  const atr = calculateWilderATR(ordered, 14);
  const rsi = calculateWilderRSI(ordered, 14);
  return {
    openTime: last.openTime, close: last.close, volume: last.volume,
    ema50, ema200, atr, rsi,
    atrPct: last.close ? (atr / last.close) * 100 : 0,
    trend: ema50 && ema200 ? (last.close > ema50 && ema50 > ema200 ? "BULLISH" : last.close < ema50 && ema50 < ema200 ? "BEARISH" : "MIXED") : "UNKNOWN",
  };
};

export async function buildBtcMarketContext() {
  const [m15,h1,h4] = await Promise.all([
    Candle15m.find().sort({openTime:-1}).limit(250).lean(),
    Candle1h.find().sort({openTime:-1}).limit(250).lean(),
    Candle4h.find().sort({openTime:-1}).limit(250).lean(),
  ]);
  const context = { m15: frame(m15), h1: frame(h1), h4: frame(h4) };
  if (!context.m15 || m15.length < 200) throw new Error("V3 requires at least 200 stored 15m candles");
  if (!context.h1 || h1.length < 200) throw new Error("V3 requires at least 200 stored 1h candles");
  if (!context.h4 || h4.length < 200) throw new Error("V3 requires at least 200 stored 4h candles");
  context.regime = context.h4?.trend === context.h1?.trend ? context.h1?.trend : "MIXED";
  context.candleTime = context.m15?.openTime || Date.now();
  return context;
}
