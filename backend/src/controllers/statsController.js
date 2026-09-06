import Trade from "../models/Trade.js";

const FINAL_V2_VERSION = "v2-live-tp1-lock";

const round = (value, decimals = 2) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getResultBucket = (trade) => {
  if (trade.status !== "CLOSED") return "OPEN";
  if (trade.result === "TP1_LOCK_HIT" || trade.result === "TP2_HIT") return "WIN";
  if (trade.result === "SL_HIT") return "LOSS";
  return "OPEN";
};

const summarize = (trades) => {
  const wins = trades.filter((trade) => getResultBucket(trade) === "WIN");
  const losses = trades.filter((trade) => getResultBucket(trade) === "LOSS");
  const closed = [...wins, ...losses];
  const totalWinsPnL = wins.reduce((total, trade) => total + (trade.pnlPoints || 0), 0);
  const totalLossPnL = Math.abs(losses.reduce((total, trade) => total + (trade.pnlPoints || 0), 0));
  const totalPnL = closed.reduce((total, trade) => total + (trade.pnlPoints || 0), 0);
  const averageWin = wins.length ? totalWinsPnL / wins.length : 0;
  const averageLoss = losses.length ? totalLossPnL / losses.length : 0;
  const closedWinRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const expectancyPoints = closed.length ? totalPnL / closed.length : 0;
  const profitFactor = totalLossPnL > 0 ? totalWinsPnL / totalLossPnL : totalWinsPnL > 0 ? null : 0;
  const tp1LockWins = closed.filter((trade) => trade.result === "TP1_LOCK_HIT").length;
  const tp2Wins = closed.filter((trade) => trade.result === "TP2_HIT").length;

  return {
    total: trades.length,
    closed: closed.length,
    open: trades.length - closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: round(closedWinRate),
    totalPnL: round(totalPnL),
    averageWin: round(averageWin),
    averageLoss: round(averageLoss),
    expectancyPoints: round(expectancyPoints),
    profitFactor: profitFactor === null ? "∞" : round(profitFactor),
    tp1LockWins,
    tp2Wins,
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
  return Object.fromEntries([...groups.entries()].map(([key, bucket]) => [key, summarize(bucket)]));
};

const responseFor = (trades, strategyVersion = null) => {
  const overall = summarize(trades);
  return {
    strategyVersion,
    managementPlan: strategyVersion === FINAL_V2_VERSION ? "TP1_LOCK_TO_TP1" : null,
    totalTrades: trades.length,
    closedTrades: overall.closed,
    openTrades: overall.open,
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
    tp1LockWins: overall.tp1LockWins,
    tp2Hits: trades.filter((trade) => trade.tp2Hit).length,
    tp2Wins: overall.tp2Wins,
    performance: {
      byDirection: groupPerformance(trades, (trade) => trade.signal),
      byScore: groupPerformance(trades, (trade) => trade.score),
      byTrend: groupPerformance(trades, (trade) => trade.trend),
      byLiquidity: groupPerformance(trades, (trade) => trade.liquidity ? trade.liquidityType || "detected" : "none"),
      bySession: groupPerformance(trades, (trade) => trade.session ? "active-session" : "off-session"),
      byStrategyVersion: groupPerformance(trades, (trade) => trade.strategyVersion || "v1-legacy"),
    },
  };
};

export const getStats = async (req, res) => {
  try {
    const trades = await Trade.find().lean();
    res.json(responseFor(trades));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getV2LiveStats = async (req, res) => {
  try {
    const trades = await Trade.find({ strategyVersion: FINAL_V2_VERSION }).lean();
    res.json(responseFor(trades, FINAL_V2_VERSION));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
