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

const getR = (result) => {
  if (result === "TP2_WIN") return 2;
  if (result === "TP1_WIN") return 1;
  if (result === "LOSS") return -1;
  return 0;
};

const getCandidateFeatures = (history) => {
  const recent = history.slice(-1000);
  const current = recent.at(-1);
  const atr = calculateWilderATR(recent, 14);
  const ema50 = calculateEMAStandard(recent, 50);
  const volume = volumeAnalysisV3(recent, 20);

  return {
    volumeRatio: Number(volume?.ratio || 0),
    volumeBias: volume?.directionalBias || "neutral",
    ema50DistanceAtr:
      atr > 0 && ema50 != null && current?.close != null
        ? (current.close - ema50) / atr
        : null,
  };
};

const candidatePasses = (features) => {
  const volumeOk = features.volumeRatio >= 1.4 && features.volumeRatio < 2.2;
  const biasOk = features.volumeBias !== "bullish";
  const emaDistance = features.ema50DistanceAtr;
  const avoidsWeakZone = Number.isFinite(emaDistance)
    ? !(emaDistance >= 1 && emaDistance < 2)
    : false;

  return volumeOk && biasOk && avoidsWeakZone;
};

const summarizeTrades = (tradeLogs) => {
  const trades = tradeLogs.length;
  const wins = tradeLogs.filter((trade) => trade.rMultiple > 0).length;
  const losses = tradeLogs.filter((trade) => trade.rMultiple < 0).length;
  const tp1Wins = tradeLogs.filter((trade) => trade.result === "TP1_WIN").length;
  const tp2Wins = tradeLogs.filter((trade) => trade.result === "TP2_WIN").length;
  const totalR = tradeLogs.reduce((sum, trade) => sum + trade.rMultiple, 0);
  const grossWinR = tradeLogs.reduce((sum, trade) => sum + Math.max(trade.rMultiple, 0), 0);
  const grossLossR = Math.abs(tradeLogs.reduce((sum, trade) => sum + Math.min(trade.rMultiple, 0), 0));

  const byDirection = ["BUY", "SELL"].reduce((acc, direction) => {
    const rows = tradeLogs.filter((trade) => trade.signal === direction);
    const dirWins = rows.filter((trade) => trade.rMultiple > 0).length;
    const dirR = rows.reduce((sum, trade) => sum + trade.rMultiple, 0);
    const dirGrossWin = rows.reduce((sum, trade) => sum + Math.max(trade.rMultiple, 0), 0);
    const dirGrossLoss = Math.abs(rows.reduce((sum, trade) => sum + Math.min(trade.rMultiple, 0), 0));

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
      const candle = candles[j];

      if (!filled) {
        const entryTouched = signal.signal === "BUY"
          ? candle.low <= signal.entry
          : candle.high >= signal.entry;
        if (!entryTouched) continue;
        filled = true;
      }

      if (signal.signal === "BUY") {
        const hitsStop = candle.low <= stopLoss;
        const hitsTp1 = candle.high >= signal.takeProfit1;
        const hitsTp2 = candle.high >= signal.takeProfit2;

        if (!tp1Hit && hitsStop && hitsTp1) {
          tradeAmbiguous = true;
          ambiguousBars++;
          result = "LOSS";
          tradeClosedAt = j;
          break;
        }
        if (tp1Hit && hitsStop && hitsTp2) {
          tradeAmbiguous = true;
          ambiguousBars++;
          result = "TP1_WIN";
          tradeClosedAt = j;
          break;
        }
        if (!tp1Hit && hitsStop) {
          result = "LOSS";
          tradeClosedAt = j;
          break;
        }
        if (hitsTp2) {
          tp1Hit = true;
          result = "TP2_WIN";
          tradeClosedAt = j;
          break;
        }
        if (!tp1Hit && hitsTp1) {
          tp1Hit = true;
          stopLoss = signal.takeProfit1;
          continue;
        }
        if (tp1Hit && hitsStop) {
          result = "TP1_WIN";
          tradeClosedAt = j;
          break;
        }
      } else {
        const hitsStop = candle.high >= stopLoss;
        const hitsTp1 = candle.low <= signal.takeProfit1;
        const hitsTp2 = candle.low <= signal.takeProfit2;

        if (!tp1Hit && hitsStop && hitsTp1) {
          tradeAmbiguous = true;
          ambiguousBars++;
          result = "LOSS";
          tradeClosedAt = j;
          break;
        }
        if (tp1Hit && hitsStop && hitsTp2) {
          tradeAmbiguous = true;
          ambiguousBars++;
          result = "TP1_WIN";
          tradeClosedAt = j;
          break;
        }
        if (!tp1Hit && hitsStop) {
          result = "LOSS";
          tradeClosedAt = j;
          break;
        }
        if (hitsTp2) {
          tp1Hit = true;
          result = "TP2_WIN";
          tradeClosedAt = j;
          break;
        }
        if (!tp1Hit && hitsTp1) {
          tp1Hit = true;
          stopLoss = signal.takeProfit1;
          continue;
        }
        if (tp1Hit && hitsStop) {
          result = "TP1_WIN";
          tradeClosedAt = j;
          break;
        }
      }
    }

    if (!filled) {
      unfilled++;
      i++;
      continue;
    }

    if (!result) {
      unresolved++;
      i++;
      continue;
    }

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
    ...summarizeTrades(tradeLogs),
    rejectedSignals,
    unfilled,
    unresolved,
    ambiguousBars,
  };
};

const aggregateWindows = (windows, key) => {
  const rows = windows.flatMap((window) => window[key]?.tradeLogs || []);
  return summarizeTrades(rows);
};

export const runBacktestValidation = async (req, res) => {
  try {
    const requestedWindows = Math.min(
      Math.max(Number.parseInt(req.query.windows, 10) || MAX_WINDOWS, 2),
      MAX_WINDOWS,
    );
    const candleLimit = requestedWindows * WINDOW_SIZE;

    const newest = await Candle15m.find()
      .sort({ openTime: -1 })
      .limit(candleLimit)
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
    const aggregateBaselineLogs = [];
    const aggregateCandidateLogs = [];

    for (let w = 0; w < windowCount; w++) {
      const candles = usable.slice(w * WINDOW_SIZE, (w + 1) * WINDOW_SIZE);
      const baseline = runWindow(candles, "baseline");
      const candidate = runWindow(candles, "candidate");

      // Recreate compact logs for aggregate statistics without exposing all rows.
      const baselineReplay = runWindowWithLogs(candles, "baseline");
      const candidateReplay = runWindowWithLogs(candles, "candidate");
      aggregateBaselineLogs.push(...baselineReplay.tradeLogs);
      aggregateCandidateLogs.push(...candidateReplay.tradeLogs);

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
          profitFactor: candidate.profitFactor == null || baseline.profitFactor == null
            ? null
            : round(candidate.profitFactor - baseline.profitFactor),
          totalR: round(candidate.totalR - baseline.totalR),
          trades: candidate.trades - baseline.trades,
        },
      });
    }

    const baselineAggregate = summarizeTrades(aggregateBaselineLogs);
    const candidateAggregate = summarizeTrades(aggregateCandidateLogs);
    const windowsAtOrAbove70 = windows.filter((window) => window.candidate.winRate >= 70).length;
    const profitableWindows = windows.filter((window) => window.candidate.expectancyR > 0 && (window.candidate.profitFactor == null || window.candidate.profitFactor > 1)).length;
    const beatsBaselineWindows = windows.filter((window) =>
      window.candidate.winRate > window.baseline.winRate &&
      window.candidate.expectancyR >= window.baseline.expectancyR &&
      (window.candidate.profitFactor == null || window.baseline.profitFactor == null || window.candidate.profitFactor >= window.baseline.profitFactor)
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
      strategy: "V2 current signal engine",
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
        execution: "Baseline and candidate are simulated independently with identical V2 entry/SL/TP execution. Rejected candidate signals do not block later signals.",
      },
      availableCandles: allCandles.length,
      windows,
      aggregate: {
        baseline: baselineAggregate,
        candidate: candidateAggregate,
        delta: {
          winRate: round(candidateAggregate.winRate - baselineAggregate.winRate, 2),
          expectancyR: round(candidateAggregate.expectancyR - baselineAggregate.expectancyR),
          profitFactor: candidateAggregate.profitFactor == null || baselineAggregate.profitFactor == null
            ? null
            : round(candidateAggregate.profitFactor - baselineAggregate.profitFactor),
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
      note: "Research validation only. A strong result still needs trading costs, additional unseen data and forward/paper validation before changing live V2.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Same engine as runWindow, but returns logs for cross-window aggregation.
const runWindowWithLogs = (candles, mode) => {
  const tradeLogs = [];
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
        i++;
        continue;
      }
    }

    let filled = false;
    let result = null;
    let tradeClosedAt = i;
    let tp1Hit = false;
    let stopLoss = signal.stopLoss;

    for (let j = i + 1; j < candles.length; j++) {
      const candle = candles[j];
      if (!filled) {
        const touched = signal.signal === "BUY" ? candle.low <= signal.entry : candle.high >= signal.entry;
        if (!touched) continue;
        filled = true;
      }

      if (signal.signal === "BUY") {
        const stop = candle.low <= stopLoss;
        const tp1 = candle.high >= signal.takeProfit1;
        const tp2 = candle.high >= signal.takeProfit2;
        if (!tp1Hit && stop && tp1) { result = "LOSS"; tradeClosedAt = j; break; }
        if (tp1Hit && stop && tp2) { result = "TP1_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && stop) { result = "LOSS"; tradeClosedAt = j; break; }
        if (tp2) { result = "TP2_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && tp1) { tp1Hit = true; stopLoss = signal.takeProfit1; continue; }
        if (tp1Hit && stop) { result = "TP1_WIN"; tradeClosedAt = j; break; }
      } else {
        const stop = candle.high >= stopLoss;
        const tp1 = candle.low <= signal.takeProfit1;
        const tp2 = candle.low <= signal.takeProfit2;
        if (!tp1Hit && stop && tp1) { result = "LOSS"; tradeClosedAt = j; break; }
        if (tp1Hit && stop && tp2) { result = "TP1_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && stop) { result = "LOSS"; tradeClosedAt = j; break; }
        if (tp2) { result = "TP2_WIN"; tradeClosedAt = j; break; }
        if (!tp1Hit && tp1) { tp1Hit = true; stopLoss = signal.takeProfit1; continue; }
        if (tp1Hit && stop) { result = "TP1_WIN"; tradeClosedAt = j; break; }
      }
    }

    if (!filled || !result) {
      i++;
      continue;
    }

    tradeLogs.push({ signal: signal.signal, result, rMultiple: getR(result), candidateFeatures });
    i = tradeClosedAt + 1;
  }

  return { tradeLogs };
};

export default runBacktestValidation;
