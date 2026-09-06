import Candle15m from "../models/Candle15m.js";
import signalEngine from "../services/analysis/signalEngine.js";
import volumeAnalysisV3 from "../services/analysis/volumeAnalysisV3.js";
import {
  calculateEMAStandard,
  calculateWilderATR,
} from "../services/analysis/indicatorUtilsV3.js";

const WINDOW_SIZE = 10000;
const MAX_WINDOWS = 3;
const REQUIRED_WARMUP = 250;

const round = (value, digits = 3) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const getR = (result) => result === "TP2_WIN" ? 2 : result === "TP1_WIN" ? 1 : result === "LOSS" ? -1 : 0;

const getCandidateFeatures = (history) => {
  const recent = history.slice(-1000);
  const current = recent.at(-1);
  const atr = calculateWilderATR(recent, 14);
  const ema50 = calculateEMAStandard(recent, 50);
  const volume = volumeAnalysisV3(recent, 20);
  return {
    volumeRatio: Number(volume?.ratio || 0),
    volumeBias: volume?.directionalBias || "neutral",
    ema50DistanceAtr: atr > 0 && ema50 != null && current?.close != null
      ? (current.close - ema50) / atr
      : null,
  };
};

const candidatePasses = (f) =>
  f.volumeRatio >= 1.4 &&
  f.volumeRatio < 2.2 &&
  f.volumeBias !== "bullish" &&
  Number.isFinite(f.ema50DistanceAtr) &&
  !(f.ema50DistanceAtr >= 1 && f.ema50DistanceAtr < 2);

const summarizeTrades = (tradeLogs) => {
  const trades = tradeLogs.length;
  const wins = tradeLogs.filter((t) => t.rMultiple > 0).length;
  const losses = tradeLogs.filter((t) => t.rMultiple < 0).length;
  const tp1Wins = tradeLogs.filter((t) => t.result === "TP1_WIN").length;
  const tp2Wins = tradeLogs.filter((t) => t.result === "TP2_WIN").length;
  const totalR = tradeLogs.reduce((s, t) => s + t.rMultiple, 0);
  const grossWinR = tradeLogs.reduce((s, t) => s + Math.max(t.rMultiple, 0), 0);
  const grossLossR = Math.abs(tradeLogs.reduce((s, t) => s + Math.min(t.rMultiple, 0), 0));

  const byDirection = ["BUY", "SELL"].reduce((acc, direction) => {
    const rows = tradeLogs.filter((t) => t.signal === direction);
    const dirWins = rows.filter((t) => t.rMultiple > 0).length;
    const dirR = rows.reduce((s, t) => s + t.rMultiple, 0);
    const dirGrossWin = rows.reduce((s, t) => s + Math.max(t.rMultiple, 0), 0);
    const dirGrossLoss = Math.abs(rows.reduce((s, t) => s + Math.min(t.rMultiple, 0), 0));
    acc[direction] = {
      trades: rows.length,
      wins: dirWins,
      losses: rows.length - dirWins,
      winRate: rows.length ? round((dirWins / rows.length) * 100, 2) : 0,
      expectancyR: rows.length ? round(dirR / rows.length) : 0,
      profitFactor: dirGrossLoss > 0 ? round(dirGrossWin / dirGrossLoss) : dirGrossWin > 0 ? null : 0,
      totalR: round(dirR),
    };
    return acc;
  }, {});

  return {
    trades,
    wins,
    losses,
    tp1Wins,
    tp2Wins,
    winRate: trades ? round((wins / trades) * 100, 2) : 0,
    expectancyR: trades ? round(totalR / trades) : 0,
    profitFactor: grossLossR > 0 ? round(grossWinR / grossLossR) : grossWinR > 0 ? null : 0,
    totalR: round(totalR),
    byDirection,
  };
};

const runWindow = (candles, mode) => {
  const tradeLogs = [];
  let rejectedSignals = 0;
  let unfilled = 0;
  let unresolved = 0;
  let ambiguousBars = 0;
  let i = REQUIRED_WARMUP - 1;

  while (i < candles.length - 1) {
    const history = candles.slice(0, i + 1);
    const signal = signalEngine(history);
    if (!signal || signal.signal === "NONE") {
      i++;
      continue;
    }

    let candidateFeatures = null;
    if (mode === "candidate") {
      candidateFeatures = getCandidateFeatures(history);
      if (!candidatePasses(candidateFeatures)) {
        rejectedSignals++;
        i++;
        continue;
      }
    }

    let filled = false;
    let result = null;
    let tradeClosedAt = i;
    let tp1Hit = false;
    let stopLoss = signal.stopLoss;
    let tradeAmbiguous = false;

    for (let j = i + 1; j < candles.length; j++) {
      const c = candles[j];
      if (!filled) {
        const touched = signal.signal === "BUY" ? c.low <= signal.entry : c.high >= signal.entry;
        if (!touched) continue;
        filled = true;
      }

      if (signal.signal === "BUY") {
        const stop = c.low <= stopLoss;
        const tp1 = c.high >= signal.takeProfit1;
        const tp2 = c.high >= signal.takeProfit2;
        if (!tp1Hit && stop && tp1) { tradeAmbiguous = true; ambiguousBars++; result = "LOSS"; tradeClosedAt = j; break; }
        if (tp1Hit && stop && tp2) { tradeAmbiguous = true; ambiguousBars++; result = "TP1_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && stop) { result = "LOSS"; tradeClosedAt = j; break; }
        if (tp2) { tp1Hit = true; result = "TP2_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && tp1) { tp1Hit = true; stopLoss = signal.takeProfit1; continue; }
        if (tp1Hit && stop) { result = "TP1_WIN"; tradeClosedAt = j; break; }
      } else {
        const stop = c.high >= stopLoss;
        const tp1 = c.low <= signal.takeProfit1;
        const tp2 = c.low <= signal.takeProfit2;
        if (!tp1Hit && stop && tp1) { tradeAmbiguous = true; ambiguousBars++; result = "LOSS"; tradeClosedAt = j; break; }
        if (tp1Hit && stop && tp2) { tradeAmbiguous = true; ambiguousBars++; result = "TP1_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && stop) { result = "LOSS"; tradeClosedAt = j; break; }
        if (tp2) { tp1Hit = true; result = "TP2_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && tp1) { tp1Hit = true; stopLoss = signal.takeProfit1; continue; }
        if (tp1Hit && stop) { result = "TP1_WIN"; tradeClosedAt = j; break; }
      }
    }

    if (!filled) { unfilled++; i++; continue; }
    if (!result) { unresolved++; i++; continue; }

    tradeLogs.push({
      signal: signal.signal,
      result,
      rMultiple: getR(result),
      ambiguous: tradeAmbiguous,
      signalTime: candles[i]?.openTime,
      closeTime: candles[tradeClosedAt]?.openTime,
      candidateFeatures,
    });
    i = tradeClosedAt + 1;
  }

  return {
    tradeLogs,
    stats: summarizeTrades(tradeLogs),
    rejectedSignals,
    unfilled,
    unresolved,
    ambiguousBars,
  };
};

const publicRun = (run) => ({
  ...run.stats,
  rejectedSignals: run.rejectedSignals,
  unfilled: run.unfilled,
  unresolved: run.unresolved,
  ambiguousBars: run.ambiguousBars,
});

export const runBacktestValidation = async (req, res) => {
  try {
    const requestedWindows = Math.min(Math.max(Number.parseInt(req.query.windows, 10) || MAX_WINDOWS, 2), MAX_WINDOWS);
    const newest = await Candle15m.find()
      .sort({ openTime: -1 })
      .limit(requestedWindows * WINDOW_SIZE)
      .lean();

    const allCandles = newest.reverse();
    const fullWindows = Math.floor(allCandles.length / WINDOW_SIZE);
    const windowCount = Math.min(fullWindows, requestedWindows);

    if (windowCount < 2) {
      return res.status(400).json({
        message: "Need at least 20,000 stored 15m candles for non-overlapping validation.",
        availableCandles: allCandles.length,
        requiredCandles: WINDOW_SIZE * 2,
      });
    }

    const usable = allCandles.slice(-(windowCount * WINDOW_SIZE));
    const windows = [];
    const baselineLogs = [];
    const candidateLogs = [];

    for (let w = 0; w < windowCount; w++) {
      const candles = usable.slice(w * WINDOW_SIZE, (w + 1) * WINDOW_SIZE);
      const baselineRun = runWindow(candles, "baseline");
      const candidateRun = runWindow(candles, "candidate");
      baselineLogs.push(...baselineRun.tradeLogs);
      candidateLogs.push(...candidateRun.tradeLogs);
      const baseline = publicRun(baselineRun);
      const candidate = publicRun(candidateRun);

      windows.push({
        window: w + 1,
        label: w === windowCount - 1 ? "Latest" : `${windowCount - w - 1} window(s) back`,
        startTime: candles[0]?.openTime,
        endTime: candles.at(-1)?.openTime,
        candleCount: candles.length,
        baseline,
        candidate,
        delta: {
          winRate: round(candidate.winRate - baseline.winRate, 2),
          expectancyR: round(candidate.expectancyR - baseline.expectancyR),
          profitFactor: candidate.profitFactor == null || baseline.profitFactor == null ? null : round(candidate.profitFactor - baseline.profitFactor),
          totalR: round(candidate.totalR - baseline.totalR),
          trades: candidate.trades - baseline.trades,
        },
      });
    }

    const baselineAggregate = summarizeTrades(baselineLogs);
    const candidateAggregate = summarizeTrades(candidateLogs);
    const windowsAtOrAbove70 = windows.filter((w) => w.candidate.winRate >= 70).length;
    const profitableWindows = windows.filter((w) => w.candidate.expectancyR > 0 && (w.candidate.profitFactor == null || w.candidate.profitFactor > 1)).length;
    const beatsBaselineWindows = windows.filter((w) =>
      w.candidate.winRate > w.baseline.winRate &&
      w.candidate.expectancyR >= w.baseline.expectancyR &&
      (w.candidate.profitFactor == null || w.baseline.profitFactor == null || w.candidate.profitFactor >= w.baseline.profitFactor)
    ).length;

    let verdict = "REJECT";
    if (
      profitableWindows === windowCount &&
      beatsBaselineWindows >= Math.ceil(windowCount * 0.67) &&
      candidateAggregate.winRate >= 65 &&
      candidateAggregate.expectancyR > 0 &&
      (candidateAggregate.profitFactor == null || candidateAggregate.profitFactor >= 1.5)
    ) {
      verdict = windowsAtOrAbove70 >= Math.ceil(windowCount / 2) ? "PROMISING" : "WATCH";
    }

    res.json({
      validationVersion: "v2-candidate-oos-3x10k",
      candidate: {
        name: "Volume 1.4–2.2x + bearish/neutral volume bias + avoid EMA50 +1 to +2 ATR",
        rules: [
          "Enhanced volume ratio >= 1.4 and < 2.2",
          "Enhanced directional volume bias is bearish or neutral",
          "EMA50 distance is not between +1 and +2 ATR",
        ],
        liveTradingChanged: false,
      },
      methodology: {
        windowSize: WINDOW_SIZE,
        nonOverlapping: true,
        windowsRequested: requestedWindows,
        windowsTested: windowCount,
        execution: "Baseline and candidate are simulated independently with identical V2 execution. Rejected candidate signals do not block later signals.",
      },
      availableCandles: allCandles.length,
      windows,
      aggregate: {
        baseline: baselineAggregate,
        candidate: candidateAggregate,
        delta: {
          winRate: round(candidateAggregate.winRate - baselineAggregate.winRate, 2),
          expectancyR: round(candidateAggregate.expectancyR - baselineAggregate.expectancyR),
          profitFactor: candidateAggregate.profitFactor == null || baselineAggregate.profitFactor == null ? null : round(candidateAggregate.profitFactor - baselineAggregate.profitFactor),
          totalR: round(candidateAggregate.totalR - baselineAggregate.totalR),
          trades: candidateAggregate.trades - baselineAggregate.trades,
        },
      },
      robustness: {
        windowsAtOrAbove70,
        profitableWindows,
        beatsBaselineWindows,
        totalWindows: windowCount,
        verdict,
      },
      note: "Research validation only. Strong results still require fees/slippage, more unseen data and forward/paper validation before live V2 changes.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export default runBacktestValidation;
