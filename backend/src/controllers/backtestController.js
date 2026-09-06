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

export const runBacktest = async (req, res) => {
  try {
    // Keep research runs fast and repeatable: always use only the newest 10,000 15m candles.
    const newestCandles = await Candle15m.find()
      .sort({ openTime: -1 })
      .limit(BACKTEST_CANDLE_LIMIT)
      .lean();

    const candles = newestCandles.reverse();

    if (candles.length < 252) {
      return res.status(400).json({
        message: "Not enough 15m candles to run backtest",
        candleCount: candles.length,
        minimumRequired: 252,
      });
    }

    let tp1Wins = 0;
    let tp2Wins = 0;
    let losses = 0;
    let unfilled = 0;
    let unresolved = 0;
    let ambiguousBars = 0;

    const tradeLogs = [];
    let i = 249;

    while (i < candles.length - 1) {
      const history = candles.slice(0, i + 1);
      const signal = signalEngine(history);

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
      let tradeAmbiguous = false;

      for (let j = i + 1; j < candles.length; j++) {
        const candle = candles[j];

        if (!filled) {
          const entryTouched =
            signal.signal === "BUY"
              ? candle.low <= signal.entry
              : candle.high >= signal.entry;

          if (!entryTouched) continue;

          filled = true;
          fillTime = candle.openTime;
        }

        barsHeld++;

        if (signal.signal === "BUY") {
          mfePoints = Math.max(mfePoints, candle.high - signal.entry);
          maePoints = Math.max(maePoints, signal.entry - candle.low);

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
          mfePoints = Math.max(mfePoints, signal.entry - candle.low);
          maePoints = Math.max(maePoints, candle.high - signal.entry);

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

      if (result === "TP1_WIN") tp1Wins++;
      if (result === "TP2_WIN") tp2Wins++;
      if (result === "LOSS") losses++;

      const riskPoints = Math.abs(signal.entry - signal.stopLoss);
      const rMultiple = getR(result);

      tradeLogs.push({
        result,
        rMultiple,
        tp1Hit,
        ambiguous: tradeAmbiguous,
        filled,
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
        riskPoints,
        mfePoints: round(mfePoints),
        maePoints: round(maePoints),
        mfeR: riskPoints ? round(mfePoints / riskPoints) : 0,
        maeR: riskPoints ? round(maePoints / riskPoints) : 0,
        barsHeld,
        signalTime: candles[i]?.openTime,
        fillTime,
        closeTime: candles[tradeClosedAt]?.openTime,
      });

      i = tradeClosedAt + 1;
    }

    const total = tp1Wins + tp2Wins + losses;
    const wins = tp1Wins + tp2Wins;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalR = tp1Wins + tp2Wins * 2 - losses;
    const expectancyR = total > 0 ? totalR / total : 0;
    const grossWinR = tp1Wins + tp2Wins * 2;
    const grossLossR = losses;
    const profitFactor = grossLossR > 0 ? grossWinR / grossLossR : 0;

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
      backtestVersion: "v2-execution-10k",
      note: "Uses only the latest 10,000 stored 15m candles with corrected entry-fill and conservative same-candle execution handling.",
      candleLimit: BACKTEST_CANDLE_LIMIT,
      candleCount: candles.length,
      windowStartTime: candles[0]?.openTime,
      windowEndTime: candles[candles.length - 1]?.openTime,
      trades: total,
      wins,
      tp1Wins,
      tp2Wins,
      losses,
      unfilled,
      unresolved,
      ambiguousBars,
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
