import Candle15m from "../models/Candle15m.js";
import signalEngine from "../services/analysis/signalEngine.js";

const WINDOW_SIZE = 10000;
const MAX_WINDOWS = 3;
const WARMUP = 250;
const COST_R = 0.05; // configurable research stress cost per completed trade

const round = (v, d = 3) => {
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

const rFor = (result) => result === "TP2_WIN" ? 2 : result === "TP1_WIN" ? 1 : -1;

const summarize = (logs, costR = 0) => {
  const net = logs.map((t) => ({ ...t, netR: t.rMultiple - costR }));
  const trades = net.length;
  const wins = net.filter((t) => t.netR > 0).length;
  const totalR = net.reduce((s, t) => s + t.netR, 0);
  const grossWin = net.reduce((s, t) => s + Math.max(t.netR, 0), 0);
  const grossLoss = Math.abs(net.reduce((s, t) => s + Math.min(t.netR, 0), 0));
  let equity = 0, peak = 0, maxDrawdownR = 0, losingStreak = 0, maxLosingStreak = 0;
  for (const t of net) {
    equity += t.netR;
    peak = Math.max(peak, equity);
    maxDrawdownR = Math.max(maxDrawdownR, peak - equity);
    if (t.netR < 0) { losingStreak++; maxLosingStreak = Math.max(maxLosingStreak, losingStreak); }
    else losingStreak = 0;
  }
  return {
    trades,
    wins,
    losses: trades - wins,
    winRate: trades ? round(wins / trades * 100, 2) : 0,
    expectancyR: trades ? round(totalR / trades) : 0,
    profitFactor: grossLoss > 0 ? round(grossWin / grossLoss) : grossWin > 0 ? null : 0,
    totalR: round(totalR),
    maxDrawdownR: round(maxDrawdownR),
    maxLosingStreak,
  };
};

const simulate = (candles) => {
  const logs = [];
  let i = WARMUP - 1;
  while (i < candles.length - 1) {
    const signal = signalEngine(candles.slice(0, i + 1));
    if (!signal || signal.signal === "NONE") { i++; continue; }
    let filled = false, tp1Hit = false, result = null, closeIndex = i;
    let stop = signal.stopLoss;
    for (let j = i + 1; j < candles.length; j++) {
      const c = candles[j];
      if (!filled) {
        const touched = signal.signal === "BUY" ? c.low <= signal.entry : c.high >= signal.entry;
        if (!touched) continue;
        filled = true;
      }
      if (signal.signal === "BUY") {
        const hs = c.low <= stop, h1 = c.high >= signal.takeProfit1, h2 = c.high >= signal.takeProfit2;
        if (!tp1Hit && hs && h1) { result = "LOSS"; closeIndex = j; break; }
        if (tp1Hit && hs && h2) { result = "TP1_WIN"; closeIndex = j; break; }
        if (!tp1Hit && hs) { result = "LOSS"; closeIndex = j; break; }
        if (h2) { result = "TP2_WIN"; closeIndex = j; break; }
        if (!tp1Hit && h1) { tp1Hit = true; stop = signal.takeProfit1; continue; }
        if (tp1Hit && hs) { result = "TP1_WIN"; closeIndex = j; break; }
      } else {
        const hs = c.high >= stop, h1 = c.low <= signal.takeProfit1, h2 = c.low <= signal.takeProfit2;
        if (!tp1Hit && hs && h1) { result = "LOSS"; closeIndex = j; break; }
        if (tp1Hit && hs && h2) { result = "TP1_WIN"; closeIndex = j; break; }
        if (!tp1Hit && hs) { result = "LOSS"; closeIndex = j; break; }
        if (h2) { result = "TP2_WIN"; closeIndex = j; break; }
        if (!tp1Hit && h1) { tp1Hit = true; stop = signal.takeProfit1; continue; }
        if (tp1Hit && hs) { result = "TP1_WIN"; closeIndex = j; break; }
      }
    }
    if (!filled || !result) { i++; continue; }
    logs.push({ signal: signal.signal, result, rMultiple: rFor(result), signalTime: candles[i]?.openTime });
    i = closeIndex + 1;
  }
  return logs;
};

const regime = (candles) => {
  const first = Number(candles[0]?.close || 0), last = Number(candles.at(-1)?.close || 0);
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = Number(candles[i - 1].close), cur = Number(candles[i].close);
    if (prev > 0) returns.push(Math.abs((cur - prev) / prev) * 100);
  }
  const avgAbsReturnPct = returns.length ? returns.reduce((a,b)=>a+b,0)/returns.length : 0;
  return {
    priceChangePct: round(changePct, 2),
    avgAbs15mReturnPct: round(avgAbsReturnPct, 4),
    trend: changePct > 8 ? "bullish" : changePct < -8 ? "bearish" : "range/mixed",
  };
};

export const runWalkForward = async (req, res) => {
  try {
    const newest = await Candle15m.find().sort({ openTime: -1 }).limit(MAX_WINDOWS * WINDOW_SIZE).lean();
    const all = newest.reverse();
    const count = Math.min(Math.floor(all.length / WINDOW_SIZE), MAX_WINDOWS);
    if (count < 3) return res.status(400).json({ message: "Walk-forward research requires 30,000 stored 15m candles.", availableCandles: all.length, requiredCandles: 30000 });
    const usable = all.slice(-count * WINDOW_SIZE);
    const windows = [];
    for (let w = 0; w < count; w++) {
      const candles = usable.slice(w * WINDOW_SIZE, (w + 1) * WINDOW_SIZE);
      const logs = simulate(candles);
      windows.push({
        window: w + 1,
        label: w === count - 1 ? "Latest unseen window" : `Historical window ${w + 1}`,
        startTime: candles[0]?.openTime,
        endTime: candles.at(-1)?.openTime,
        regime: regime(candles),
        gross: summarize(logs, 0),
        costStress: summarize(logs, COST_R),
      });
    }
    const discovery = windows[0];
    const validation = windows.slice(1);
    const allValidationLogs = [];
    for (let w = 1; w < count; w++) {
      const candles = usable.slice(w * WINDOW_SIZE, (w + 1) * WINDOW_SIZE);
      allValidationLogs.push(...simulate(candles));
    }
    const validationGross = summarize(allValidationLogs, 0);
    const validationCost = summarize(allValidationLogs, COST_R);
    res.json({
      researchVersion: "v2-walk-forward-risk-v1",
      liveTradingChanged: false,
      methodology: {
        discoveryWindow: 1,
        unseenValidationWindows: [2,3],
        windowSize: WINDOW_SIZE,
        costStressRPerTrade: COST_R,
        costNote: "0.05R is a configurable stress assumption, not an exchange-specific fee estimate.",
      },
      windows,
      discovery: discovery.gross,
      unseenValidation: { gross: validationGross, costStress: validationCost },
      verdict: validationCost.expectancyR > 0 && validationCost.profitFactor > 1 && validationCost.maxDrawdownR <= Math.max(12, validationCost.totalR * 0.75) ? "V2 EDGE SURVIVES STRESS" : "V2 NEEDS MORE ROBUSTNESS",
      note: "This tests V2 robustness and risk, not a newly optimized candidate. No live signal rules are changed.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
