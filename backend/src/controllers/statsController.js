import Trade from "../models/Trade.js";

const round = (value, decimals = 2) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getResultBucket = (trade) => {
  if (trade.result === "TP1_HIT" || trade.result === "TP2_HIT") {
    return "WIN";
  }

  if (trade.result === "SL_HIT") {
    return "LOSS";
  }

  return "OPEN";
};

const summarize = (trades) => {
  const wins = trades.filter((trade) => getResultBucket(trade) === "WIN");
  const losses = trades.filter((trade) => getResultBucket(trade) === "LOSS");
  const closed = [...wins, ...losses];

  const totalWinsPnL = wins.reduce(
    (total, trade) => total + (trade.pnlPoints || 0),
    0
  );

  const totalLossPnL = Math.abs(
    losses.reduce(
      (total, trade) => total + (trade.pnlPoints || 0),
      0
    )
  );

  const totalPnL = closed.reduce(
    (total, trade) => total + (trade.pnlPoints || 0),
    0
  );

  const averageWin = wins.length
    ? totalWinsPnL / wins.length
    : 0;

  const averageLoss = losses.length
    ? totalLossPnL / losses.length
    : 0;

  const closedWinRate = closed.length
    ? (wins.length / closed.length) * 100
    : 0;

  const expectancyPoints = closed.length
    ? totalPnL / closed.length
    : 0;

  const profitFactor = totalLossPnL > 0
    ? totalWinsPnL / totalLossPnL
    : totalWinsPnL > 0
      ? null
      : 0;

  return {
    total: trades.length,
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: round(closedWinRate),
    totalPnL: round(totalPnL),
    averageWin: round(averageWin),
    averageLoss: round(averageLoss),
    expectancyPoints: round(expectancyPoints),
    profitFactor: profitFactor === null ? "∞" : round(profitFactor),
  };
};

const groupPerformance = (trades, keyFn) => {
  const groups = new Map();

  for (const trade of trades) {
    const key = String(keyFn(trade) ?? "unknown");
    const bucket = groups.get(key) || [];
    bucket.push(trade);
    groups.set(key, bucket);
  }

  return Object.fromEntries(
    [...groups.entries()].map(([key, bucket]) => [
      key,
      summarize(bucket),
    ])
  );
};

export const getStats = async (req, res) => {
  try {
    const trades = await Trade.find().lean();

    const openTrades = trades.filter(
      (trade) => trade.status === "ACTIVE" || getResultBucket(trade) === "OPEN"
    );

    const overall = summarize(trades);

    res.json({
      totalTrades: trades.length,
      closedTrades: overall.closed,
      openTrades: openTrades.length,
      wins: overall.wins,
      losses: overall.losses,
      winRate: overall.winRate,
      closedWinRate: overall.winRate,
      totalPnL: overall.totalPnL,
      averageWin: overall.averageWin,
      averageLoss: overall.averageLoss,
      expectancyPoints: overall.expectancyPoints,
      profitFactor: overall.profitFactor,
      tp1Hits: trades.filter((trade) => trade.tp1Hit).length,
      tp2Hits: trades.filter((trade) => trade.tp2Hit).length,
      performance: {
        byDirection: groupPerformance(trades, (trade) => trade.signal),
        byScore: groupPerformance(trades, (trade) => trade.score),
        byTrend: groupPerformance(trades, (trade) => trade.trend),
        byLiquidity: groupPerformance(
          trades,
          (trade) => trade.liquidity ? trade.liquidityType || "detected" : "none"
        ),
        bySession: groupPerformance(
          trades,
          (trade) => trade.session ? "active-session" : "off-session"
        ),
        byStrategyVersion: groupPerformance(
          trades,
          (trade) => trade.strategyVersion || "v1-legacy"
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
