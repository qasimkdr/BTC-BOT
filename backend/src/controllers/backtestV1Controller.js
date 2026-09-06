import Candle15m from "../models/Candle15m.js";
import signalEngine from "../services/analysis/signalEngine.js";

const BACKTEST_CANDLE_LIMIT = 10000;

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

export const runBacktestV1 = async (req, res) => {
  try {
    const newestCandles = await Candle15m.find()
      .sort({ openTime: -1 })
      .limit(BACKTEST_CANDLE_LIMIT)
      .lean();

    const candles = newestCandles.reverse();

    if (candles.length < 252) {
      return res.status(400).json({
        message: "Not enough 15m candles to run V1 backtest",
        candleCount: candles.length,
        minimumRequired: 252,
      });
    }

    let tp1Wins = 0;
    let tp2Wins = 0;
    let losses = 0;
    const tradeLogs = [];

    let i = 250;

    while (i < candles.length - 1) {
      // Reproduce the original V1 tester semantics exactly:
      // the signal is calculated from candles before index i, but the trade
      // is assumed active without verifying whether the proposed entry filled.
      const history = candles.slice(0, i);
      const signal = signalEngine(history);

      if (!signal || signal.signal === "NONE") {
        i++;
        continue;
      }

      let result = null;
      let tp1Hit = false;
      let tradeClosedAt = i;
      let stopLoss = signal.stopLoss;

      for (let j = i + 1; j < candles.length; j++) {
        const candle = candles[j];

        if (signal.signal === "BUY") {
          if (!tp1Hit && candle.high >= signal.takeProfit1) {
            tp1Hit = true;
            stopLoss = signal.takeProfit1;
          }

          if (candle.low <= stopLoss) {
            result = tp1Hit ? "TP1_WIN" : "LOSS";
            tradeClosedAt = j;
            break;
          }

          if (candle.high >= signal.takeProfit2) {
            result = "TP2_WIN";
            tradeClosedAt = j;
            break;
          }
        }

        if (signal.signal === "SELL") {
          if (!tp1Hit && candle.low <= signal.takeProfit1) {
            tp1Hit = true;
            stopLoss = signal.takeProfit1;
          }

          if (candle.high >= stopLoss) {
            result = tp1Hit ? "TP1_WIN" : "LOSS";
            tradeClosedAt = j;
            break;
          }

          if (candle.low <= signal.takeProfit2) {
            result = "TP2_WIN";
            tradeClosedAt = j;
            break;
          }
        }
      }

      if (result === "TP1_WIN") tp1Wins++;
      if (result === "TP2_WIN") tp2Wins++;
      if (result === "LOSS") losses++;

      if (result) {
        tradeLogs.push({
          result,
          rMultiple: getR(result),
          signal: signal.signal,
          score: signal.score,
          trend: signal.structure?.trend,
          liquidity: signal.liquidity?.detected,
          liquidityType: signal.liquidity?.type,
          volumeRatio: signal.volume?.ratio,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          takeProfit1: signal.takeProfit1,
          takeProfit2: signal.takeProfit2,
          signalTime: candles[i]?.openTime,
          closeTime: candles[tradeClosedAt]?.openTime,
        });
      }

      i = tradeClosedAt + 1;
    }

    const total = tp1Wins + tp2Wins + losses;
    const wins = tp1Wins + tp2Wins;
    const winRate = total ? (wins / total) * 100 : 0;
    const totalR = tp1Wins + tp2Wins * 2 - losses;
    const expectancyR = total ? totalR / total : 0;
    const grossWinR = tp1Wins + tp2Wins * 2;
    const profitFactor = losses ? grossWinR / losses : 0;

    const byDirection = ["BUY", "SELL"].reduce((acc, direction) => {
      const rows = tradeLogs.filter((trade) => trade.signal === direction);
      const dirWins = rows.filter((trade) => trade.rMultiple > 0).length;
      const dirTotalR = rows.reduce((sum, trade) => sum + trade.rMultiple, 0);

      acc[direction] = {
        trades: rows.length,
        wins: dirWins,
        losses: rows.length - dirWins,
        winRate: rows.length ? round((dirWins / rows.length) * 100, 2) : 0,
        totalR: round(dirTotalR),
        expectancyR: rows.length ? round(dirTotalR / rows.length) : 0,
      };

      return acc;
    }, {});

    res.json({
      engine: "signalEngine",
      backtestVersion: "v1-legacy-10k",
      note: "Reproduces the original V1 backtester semantics on the latest 10,000 candles. It intentionally does not verify entry fills and preserves the original TP1/TP2 ordering behavior for comparison only.",
      candleLimit: BACKTEST_CANDLE_LIMIT,
      candleCount: candles.length,
      windowStartTime: candles[0]?.openTime,
      windowEndTime: candles[candles.length - 1]?.openTime,
      trades: total,
      wins,
      tp1Wins,
      tp2Wins,
      losses,
      winRate: round(winRate, 2),
      totalR: round(totalR),
      expectancyR: round(expectancyR),
      profitFactor: round(profitFactor),
      byDirection,
      tradeLogs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
