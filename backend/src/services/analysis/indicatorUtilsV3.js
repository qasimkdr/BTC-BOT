export const calculateEMAStandard = (candles, period = 200) => {
  if (!candles || candles.length < period) return null;
  const closes = candles.map((c) => Number(c.close));
  let ema = closes.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  const k = 2 / (period + 1);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
};

export const calculateWilderATR = (candles, period = 14) => {
  if (!candles || candles.length < period + 1) return 0;
  const tr = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    tr.push(Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    ));
  }
  let atr = tr.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (let i = period; i < tr.length; i++) {
    atr = ((atr * (period - 1)) + tr[i]) / period;
  }
  return atr;
};

export const calculateWilderRSI = (candles, period = 14) => {
  if (!candles || candles.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < candles.length; i++) changes.push(candles[i].close - candles[i - 1].close);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += Math.max(changes[i], 0);
    avgLoss += Math.max(-changes[i], 0);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    avgGain = ((avgGain * (period - 1)) + Math.max(changes[i], 0)) / period;
    avgLoss = ((avgLoss * (period - 1)) + Math.max(-changes[i], 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

export const aggregateCandles = (candles, groupSize = 4) => {
  if (!candles?.length || groupSize < 2) return candles || [];
  const out = [];
  const start = candles.length % groupSize;
  for (let i = start; i + groupSize <= candles.length; i += groupSize) {
    const group = candles.slice(i, i + groupSize);
    out.push({
      openTime: group[0].openTime,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + Number(c.volume || 0), 0),
    });
  }
  return out;
};
