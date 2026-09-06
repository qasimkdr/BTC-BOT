import getMarketStructureV3 from "./marketStructureV3.js";
import detectLiquidityGrabV3 from "./liquidityGrabV3.js";
import volumeAnalysisV3 from "./volumeAnalysisV3.js";
import sessionFilterV3 from "./sessionFilterV3.js";
import {
  calculateEMAStandard,
  calculateWilderATR,
  calculateWilderRSI,
} from "./indicatorUtilsV3.js";

const round = (value, digits = 3) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const summarize = (rows) => {
  const trades = rows.length;
  const wins = rows.filter((row) => row.rMultiple > 0).length;
  const totalR = rows.reduce((sum, row) => sum + Number(row.rMultiple || 0), 0);
  const grossWinR = rows.reduce((sum, row) => sum + Math.max(Number(row.rMultiple || 0), 0), 0);
  const grossLossR = Math.abs(rows.reduce((sum, row) => sum + Math.min(Number(row.rMultiple || 0), 0), 0));

  return {
    trades,
    wins,
    losses: trades - wins,
    winRate: trades ? round((wins / trades) * 100, 2) : 0,
    expectancyR: trades ? round(totalR / trades) : 0,
    totalR: round(totalR),
    profitFactor: grossLossR > 0 ? round(grossWinR / grossLossR) : grossWinR > 0 ? null : 0,
  };
};

const bucketNumeric = (rows, key, edges) => {
  const output = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const min = edges[i];
    const max = edges[i + 1];
    const last = i === edges.length - 2;
    const bucketRows = rows.filter((row) => {
      const value = Number(row[key]);
      if (!Number.isFinite(value)) return false;
      return value >= min && (last ? value <= max : value < max);
    });
    if (!bucketRows.length) continue;
    output.push({
      range: `${min} to ${max}${last ? "" : " (exclusive max)"}`,
      min,
      max,
      ...summarize(bucketRows),
    });
  }
  return output;
};

const bucketCategory = (rows, key) => {
  const values = [...new Set(rows.map((row) => row[key]).filter((value) => value !== undefined && value !== null && value !== ""))];
  return values
    .map((value) => ({ value, ...summarize(rows.filter((row) => row[key] === value)) }))
    .sort((a, b) => b.trades - a.trades);
};

const getFeatureSnapshot = (candles, index) => {
  const history = candles.slice(0, index + 1);
  const recent = history.slice(-1000);
  const current = recent.at(-1);
  const atr = calculateWilderATR(recent, 14);
  const ema50 = calculateEMAStandard(recent, 50);
  const ema200 = calculateEMAStandard(recent, 200);
  const rsi = calculateWilderRSI(recent, 14);
  const structureV3 = getMarketStructureV3(recent);
  const volumeV3 = volumeAnalysisV3(recent, 20);
  const liquidityV3 = detectLiquidityGrabV3(recent, structureV3, atr);
  const sessionV3 = sessionFilterV3(current?.openTime);

  return {
    rsi: round(rsi, 2),
    atrPct: current?.close && atr ? round((atr / current.close) * 100, 4) : 0,
    ema50DistanceAtr: atr && ema50 != null ? round((current.close - ema50) / atr, 3) : null,
    ema200DistanceAtr: atr && ema200 != null ? round((current.close - ema200) / atr, 3) : null,
    volumeRatioV3: round(volumeV3?.ratio || 0, 3),
    volumeBiasV3: volumeV3?.directionalBias || "neutral",
    structureTrendV3: structureV3?.trend || "unknown",
    regimeV3: structureV3?.regime || "unknown",
    bosV3: structureV3?.bos || "none",
    chochV3: structureV3?.choch || "none",
    liquidityDetectedV3: Boolean(liquidityV3?.detected),
    liquidityTypeV3: liquidityV3?.type || "none",
    liquidityQualityV3: round(liquidityV3?.quality || 0, 2),
    sessionNameV3: sessionV3?.activeWindow || "off-peak",
    sessionActivityV3: sessionV3?.activityScore ?? 0,
    utcHour: current?.openTime ? new Date(current.openTime).getUTCHours() : null,
    dayOfWeek: current?.openTime ? new Date(current.openTime).getUTCDay() : null,
  };
};

const buildIntersectionAnalyzer = (rows, baseline) => {
  const MIN_TRADES = 10;
  const atoms = [
    { id: "volume_1_4_2_2", label: "Volume 1.4–2.2x", test: (r) => r.volumeRatioV3 >= 1.4 && r.volumeRatioV3 < 2.2 },
    { id: "volume_1_7_2_2", label: "Volume 1.7–2.2x", test: (r) => r.volumeRatioV3 >= 1.7 && r.volumeRatioV3 < 2.2 },
    { id: "volume_not_extreme", label: "Volume <2.2x", test: (r) => r.volumeRatioV3 < 2.2 },
    { id: "bias_not_bullish", label: "Volume bias bearish/neutral", test: (r) => r.volumeBiasV3 !== "bullish" },
    { id: "bias_neutral", label: "Volume bias neutral", test: (r) => r.volumeBiasV3 === "neutral" },
    { id: "rsi_below_50", label: "RSI <50", test: (r) => r.rsi < 50 },
    { id: "rsi_outer", label: "RSI <50 or ≥65", test: (r) => r.rsi < 50 || r.rsi >= 65 },
    { id: "avoid_rsi_50_65", label: "Avoid RSI 50–65", test: (r) => r.rsi < 50 || r.rsi >= 65 },
    { id: "atr_0_4_0_7", label: "ATR% 0.4–0.7", test: (r) => r.atrPct >= 0.4 && r.atrPct < 0.7 },
    { id: "atr_ge_0_25", label: "ATR% ≥0.25", test: (r) => r.atrPct >= 0.25 },
    { id: "avoid_ema50_1_2", label: "Avoid EMA50 +1 to +2 ATR", test: (r) => !(r.ema50DistanceAtr >= 1 && r.ema50DistanceAtr < 2) },
    { id: "ema50_negative", label: "EMA50 distance <0 ATR", test: (r) => r.ema50DistanceAtr < 0 },
    { id: "ema200_far_negative", label: "EMA200 distance <-3 ATR", test: (r) => r.ema200DistanceAtr < -3 },
    { id: "ema200_far_positive", label: "EMA200 distance ≥3 ATR", test: (r) => r.ema200DistanceAtr >= 3 },
    { id: "no_bullish_liquidity", label: "No bullish liquidity sweep", test: (r) => r.liquidityTypeV3 !== "bullish" },
    { id: "hour_15_17", label: "UTC hour 15–17", test: (r) => r.utcHour >= 15 && r.utcHour <= 17 },
  ];

  const combos = [];
  const addCombo = (parts) => {
    const ids = parts.map((p) => p.id);
    if (new Set(ids).size !== ids.length) return;
    const selected = rows.filter((row) => parts.every((part) => part.test(row)));
    if (selected.length < MIN_TRADES) return;
    const stats = summarize(selected);
    const coveragePct = rows.length ? (selected.length / rows.length) * 100 : 0;
    const winRateLift = stats.winRate - baseline.winRate;
    const expectancyLift = stats.expectancyR - baseline.expectancyR;
    const pfValue = stats.profitFactor == null ? 99 : Number(stats.profitFactor || 0);
    const score =
      winRateLift * 0.45 +
      expectancyLift * 35 +
      Math.min(Math.max(pfValue - 1, 0), 3) * 5 +
      Math.min(selected.length, 40) * 0.25;

    combos.push({
      conditions: parts.map((p) => p.label),
      conditionIds: ids,
      conditionCount: parts.length,
      ...stats,
      coveragePct: round(coveragePct, 2),
      winRateLift: round(winRateLift, 2),
      expectancyLift: round(expectancyLift),
      robustScore: round(score, 2),
    });
  };

  for (let a = 0; a < atoms.length; a++) {
    for (let b = a + 1; b < atoms.length; b++) addCombo([atoms[a], atoms[b]]);
  }
  for (let a = 0; a < atoms.length; a++) {
    for (let b = a + 1; b < atoms.length; b++) {
      for (let c = b + 1; c < atoms.length; c++) addCombo([atoms[a], atoms[b], atoms[c]]);
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const combo of combos) {
    const key = `${combo.trades}|${combo.wins}|${combo.losses}|${combo.totalR}|${combo.conditions.join("+")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(combo);
  }

  const robust = deduped
    .filter((c) =>
      c.winRate > baseline.winRate &&
      c.expectancyR >= baseline.expectancyR &&
      (c.profitFactor == null || c.profitFactor >= baseline.profitFactor)
    )
    .sort((a, b) => b.robustScore - a.robustScore)
    .slice(0, 20);

  const highAccuracy = deduped
    .filter((c) => c.winRate >= 70 && c.expectancyR > 0 && (c.profitFactor == null || c.profitFactor > 1))
    .sort((a, b) => (b.trades - a.trades) || (b.winRate - a.winRate))
    .slice(0, 20);

  const harmful = deduped
    .filter((c) => c.expectancyR < 0 || (c.profitFactor != null && c.profitFactor < 1))
    .sort((a, b) => a.expectancyR - b.expectancyR)
    .slice(0, 15);

  return {
    minTrades: MIN_TRADES,
    baseline,
    testedCombinations: deduped.length,
    robust,
    highAccuracy,
    harmful,
    note: "Exploratory in-sample intersection analysis. Use for hypothesis generation only; validate any candidate on separate historical windows before changing V2.",
  };
};

export const buildBacktestDiagnostics = (tradeLogs, candles) => {
  if (!Array.isArray(tradeLogs) || !tradeLogs.length || !Array.isArray(candles) || !candles.length) {
    return { sampleSize: 0, enrichedTrades: [], breakdowns: {}, intersections: null };
  }

  const indexByTime = new Map(candles.map((candle, index) => [String(candle.openTime), index]));
  const enrichedTrades = tradeLogs.map((trade) => {
    const index = indexByTime.get(String(trade.signalTime));
    const features = Number.isInteger(index) ? getFeatureSnapshot(candles, index) : {};
    return { ...trade, ...features };
  });

  const winners = enrichedTrades.filter((row) => row.rMultiple > 0);
  const losers = enrichedTrades.filter((row) => row.rMultiple < 0);
  const overall = summarize(enrichedTrades);

  return {
    sampleSize: enrichedTrades.length,
    overall,
    winnerAverages: {
      rsi: round(winners.reduce((s, r) => s + Number(r.rsi || 0), 0) / Math.max(winners.length, 1), 2),
      volumeRatio: round(winners.reduce((s, r) => s + Number(r.volumeRatioV3 || 0), 0) / Math.max(winners.length, 1), 3),
      ema50DistanceAtr: round(winners.reduce((s, r) => s + Number(r.ema50DistanceAtr || 0), 0) / Math.max(winners.length, 1), 3),
      ema200DistanceAtr: round(winners.reduce((s, r) => s + Number(r.ema200DistanceAtr || 0), 0) / Math.max(winners.length, 1), 3),
      liquidityQuality: round(winners.reduce((s, r) => s + Number(r.liquidityQualityV3 || 0), 0) / Math.max(winners.length, 1), 2),
    },
    loserAverages: {
      rsi: round(losers.reduce((s, r) => s + Number(r.rsi || 0), 0) / Math.max(losers.length, 1), 2),
      volumeRatio: round(losers.reduce((s, r) => s + Number(r.volumeRatioV3 || 0), 0) / Math.max(losers.length, 1), 3),
      ema50DistanceAtr: round(losers.reduce((s, r) => s + Number(r.ema50DistanceAtr || 0), 0) / Math.max(losers.length, 1), 3),
      ema200DistanceAtr: round(losers.reduce((s, r) => s + Number(r.ema200DistanceAtr || 0), 0) / Math.max(losers.length, 1), 3),
      liquidityQuality: round(losers.reduce((s, r) => s + Number(r.liquidityQualityV3 || 0), 0) / Math.max(losers.length, 1), 2),
    },
    breakdowns: {
      direction: bucketCategory(enrichedTrades, "signal"),
      legacyTrend: bucketCategory(enrichedTrades, "trend"),
      structureTrendV3: bucketCategory(enrichedTrades, "structureTrendV3"),
      regimeV3: bucketCategory(enrichedTrades, "regimeV3"),
      bosV3: bucketCategory(enrichedTrades, "bosV3"),
      chochV3: bucketCategory(enrichedTrades, "chochV3"),
      liquidityTypeV3: bucketCategory(enrichedTrades, "liquidityTypeV3"),
      volumeBiasV3: bucketCategory(enrichedTrades, "volumeBiasV3"),
      sessionV3: bucketCategory(enrichedTrades, "sessionNameV3"),
      utcHour: bucketCategory(enrichedTrades, "utcHour"),
      dayOfWeek: bucketCategory(enrichedTrades, "dayOfWeek"),
      rsi: bucketNumeric(enrichedTrades, "rsi", [0, 35, 45, 50, 55, 65, 100]),
      volumeRatio: bucketNumeric(enrichedTrades, "volumeRatioV3", [0, 1, 1.2, 1.4, 1.7, 2.2, 100]),
      ema50DistanceAtr: bucketNumeric(enrichedTrades, "ema50DistanceAtr", [-100, -2, -1, 0, 1, 2, 100]),
      ema200DistanceAtr: bucketNumeric(enrichedTrades, "ema200DistanceAtr", [-100, -3, -1.5, 0, 1.5, 3, 100]),
      atrPct: bucketNumeric(enrichedTrades, "atrPct", [0, 0.15, 0.25, 0.4, 0.7, 1.2, 100]),
      liquidityQuality: bucketNumeric(enrichedTrades, "liquidityQualityV3", [0, 1, 25, 50, 75, 101]),
    },
    intersections: buildIntersectionAnalyzer(enrichedTrades, overall),
    enrichedTrades,
  };
};

export default buildBacktestDiagnostics;
