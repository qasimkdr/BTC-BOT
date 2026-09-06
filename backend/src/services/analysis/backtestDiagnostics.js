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
    sessionNameV3: sessionV3?.name || "off-hours",
    sessionActivityV3: sessionV3?.activityScore ?? 0,
    utcHour: current?.openTime ? new Date(current.openTime).getUTCHours() : null,
    dayOfWeek: current?.openTime ? new Date(current.openTime).getUTCDay() : null,
  };
};

export const buildBacktestDiagnostics = (tradeLogs, candles) => {
  if (!Array.isArray(tradeLogs) || !tradeLogs.length || !Array.isArray(candles) || !candles.length) {
    return { sampleSize: 0, enrichedTrades: [], breakdowns: {} };
  }

  const indexByTime = new Map(candles.map((candle, index) => [String(candle.openTime), index]));
  const enrichedTrades = tradeLogs.map((trade) => {
    const index = indexByTime.get(String(trade.signalTime));
    const features = Number.isInteger(index) ? getFeatureSnapshot(candles, index) : {};
    return { ...trade, ...features };
  });

  const winners = enrichedTrades.filter((row) => row.rMultiple > 0);
  const losers = enrichedTrades.filter((row) => row.rMultiple < 0);

  return {
    sampleSize: enrichedTrades.length,
    overall: summarize(enrichedTrades),
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
    enrichedTrades,
  };
};

export default buildBacktestDiagnostics;
