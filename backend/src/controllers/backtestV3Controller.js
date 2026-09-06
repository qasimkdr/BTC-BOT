import Candle15m from "../models/Candle15m.js";
import signalEngineV3 from "../services/analysis/signalEngineV3.js";

const LIMIT = 10000;
const round = (v, d = 3) => Number.isFinite(v) ? Math.round(v * (10 ** d)) / (10 ** d) : 0;
const getR = (r) => r === "TP2_WIN" ? 2 : r === "TP1_WIN" ? 1 : r === "LOSS" ? -1 : 0;

export const runBacktestV3 = async (req, res) => {
  try {
    const newest = await Candle15m.find().sort({ openTime: -1 }).limit(LIMIT).lean();
    const candles = newest.reverse();
    if (candles.length < 340) {
      return res.status(400).json({ message: "Not enough 15m candles for V3 backtest", candleCount: candles.length });
    }

    let tp1Wins = 0;
    let tp2Wins = 0;
    let losses = 0;
    let unfilled = 0;
    let unresolved = 0;
    let ambiguousBars = 0;
    const tradeLogs = [];
    let i = 319;

    while (i < candles.length - 1) {
      const signal = signalEngineV3(candles.slice(0, i + 1));
      if (!signal || signal.signal === "NONE") {
        i++;
        continue;
      }

      let filled = false;
      let fillTime = null;
      let result = null;
      let tradeClosedAt = i;
      let tp1Hit = false;
      let stopLoss = signal.stopLoss;
      let mfePoints = 0;
      let maePoints = 0;
      let barsHeld = 0;
      let ambiguous = false;

      for (let j = i + 1; j < candles.length; j++) {
        const c = candles[j];
        if (!filled) {
          const touched = signal.signal === "BUY" ? c.low <= signal.entry : c.high >= signal.entry;
          if (!touched) continue;
          filled = true;
          fillTime = c.openTime;
        }
        barsHeld++;

        if (signal.signal === "BUY") {
          mfePoints = Math.max(mfePoints, c.high - signal.entry);
          maePoints = Math.max(maePoints, signal.entry - c.low);
          const stop = c.low <= stopLoss;
          const tp1 = c.high >= signal.takeProfit1;
          const tp2 = c.high >= signal.takeProfit2;
          if (!tp1Hit && stop && tp1) { ambiguous = true; ambiguousBars++; result = "LOSS"; tradeClosedAt = j; break; }
          if (tp1Hit && stop && tp2) { ambiguous = true; ambiguousBars++; result = "TP1_WIN"; tradeClosedAt = j; break; }
          if (!tp1Hit && stop) { result = "LOSS"; tradeClosedAt = j; break; }
          if (tp2) { tp1Hit = true; result = "TP2_WIN"; tradeClosedAt = j; break; }
          if (!tp1Hit && tp1) { tp1Hit = true; stopLoss = signal.takeProfit1; continue; }
          if (tp1Hit && stop) { result = "TP1_WIN"; tradeClosedAt = j; break; }
        } else {
          mfePoints = Math.max(mfePoints, signal.entry - c.low);
          maePoints = Math.max(maePoints, c.high - signal.entry);
          const stop = c.high >= stopLoss;
          const tp1 = c.low <= signal.takeProfit1;
          const tp2 = c.low <= signal.takeProfit2;
          if (!tp1Hit && stop && tp1) { ambiguous = true; ambiguousBars++; result = "LOSS"; tradeClosedAt = j; break; }
          if (tp1Hit && stop && tp2) { ambiguous = true; ambiguousBars++; result = "TP1_WIN"; tradeClosedAt = j; break; }
          if (!tp1Hit && stop) { result = "LOSS"; tradeClosedAt = j; break; }
          if (tp2) { tp1Hit = true; result = "TP2_WIN"; tradeClosedAt = j; break; }
          if (!tp1Hit && tp1) { tp1Hit = true; stopLoss = signal.takeProfit1; continue; }
          if (tp1Hit && stop) { result = "TP1_WIN"; tradeClosedAt = j; break; }
        }
      }

      if (!filled) { unfilled++; i++; continue; }
      if (!result) { unresolved++; i++; continue; }
      if (result === "TP1_WIN") tp1Wins++;
      if (result === "TP2_WIN") tp2Wins++;
      if (result === "LOSS") losses++;

      const riskPoints = Math.abs(signal.entry - signal.stopLoss);
      tradeLogs.push({
        result,
        rMultiple: getR(result),
        signal: signal.signal,
        score: signal.score,
        strategyVersion: signal.strategyVersion,
        trend: signal.structure?.trend,
        regime: signal.structure?.regime,
        bos: signal.structure?.bos,
        choch: signal.structure?.choch,
        trend1h: signal.structure1h?.trend,
        regime1h: signal.structure1h?.regime,
        liquidity: signal.liquidity?.detected,
        liquidityType: signal.liquidity?.type,
        liquidityQuality: signal.liquidity?.quality || 0,
        volumeRatio: signal.volume?.ratio,
        volumeBias: signal.volume?.directionalBias,
        rsi: round(signal.rsi),
        atrPct: round(signal.atrPct),
        emaDistanceAtr: round(signal.emaDistanceAtr),
        ema50DistanceAtr: round(signal.ema50DistanceAtr),
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
        riskPoints,
        mfeR: riskPoints ? round(mfePoints / riskPoints) : 0,
        maeR: riskPoints ? round(maePoints / riskPoints) : 0,
        barsHeld,
        ambiguous,
        signalTime: candles[i]?.openTime,
        fillTime,
        closeTime: candles[tradeClosedAt]?.openTime,
      });
      i = tradeClosedAt + 1;
    }

    const total = tp1Wins + tp2Wins + losses;
    const wins = tp1Wins + tp2Wins;
    const totalR = tp1Wins + (tp2Wins * 2) - losses;
    const grossWinR = tp1Wins + (tp2Wins * 2);
    const byDirection = ["BUY", "SELL"].reduce((acc, direction) => {
      const rows = tradeLogs.filter((t) => t.signal === direction);
      const dirWins = rows.filter((t) => t.rMultiple > 0).length;
      const dirR = rows.reduce((s, t) => s + t.rMultiple, 0);
      acc[direction] = {
        trades: rows.length,
        wins: dirWins,
        losses: rows.length - dirWins,
        winRate: rows.length ? round((dirWins / rows.length) * 100, 2) : 0,
        totalR: round(dirR),
        expectancyR: rows.length ? round(dirR / rows.length) : 0,
      };
      return acc;
    }, {});

    res.json({
      engine: "signalEngineV3",
      backtestVersion: "v3-enhanced-10k",
      note: "Research-only V3 using improved structure/BOS/CHOCH, swing-based liquidity quality, directional relative volume, standard EMA, Wilder ATR/RSI, 1H context, anti-chasing and volatility regime filters. Live engine unchanged.",
      candleLimit: LIMIT,
      candleCount: candles.length,
      windowStartTime: candles[0]?.openTime,
      windowEndTime: candles.at(-1)?.openTime,
      trades: total,
      wins,
      tp1Wins,
      tp2Wins,
      losses,
      unfilled,
      unresolved,
      ambiguousBars,
      winRate: total ? round((wins / total) * 100, 2) : 0,
      totalR: round(totalR),
      expectancyR: total ? round(totalR / total) : 0,
      profitFactor: losses ? round(grossWinR / losses) : 0,
      byDirection,
      tradeLogs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
