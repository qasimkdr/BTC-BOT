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

const toMs = (value) => {
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export const aggregateCandles = (candles, groupSize = 4, sourceMinutes = 15) => {
  if (!candles?.length || groupSize < 2) return candles || [];

  const bucketMs = groupSize * sourceMinutes * 60 * 1000;
  const buckets = new Map();

  for (const candle of candles) {
    const timeMs = toMs(candle.openTime);
    if (!Number.isFinite(timeMs)) continue;

    const bucket = Math.floor(timeMs / bucketMs) * bucketMs;
    const existing = buckets.get(bucket);

    if (!existing) {
      buckets.set(bucket, {
        openTime: bucket,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume || 0),
        count: 1,
      });
      continue;
    }

    existing.high = Math.max(existing.high, Number(candle.high));
    existing.low = Math.min(existing.low, Number(candle.low));
    existing.close = Number(candle.close);
    existing.volume += Number(candle.volume || 0);
    existing.count += 1;
  }

  // Only use complete higher-timeframe candles. This prevents partial 1H bars from
  // changing historical structure/EMA values as new 15m candles arrive.
  return [...buckets.values()]
    .filter((candle) => candle.count === groupSize)
    .sort((a, b) => a.openTime - b.openTime)
    .map(({ count, ...candle }) => candle);
};
