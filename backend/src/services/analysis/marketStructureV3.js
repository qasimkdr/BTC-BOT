const findSwings = (candles, left = 3, right = 3) => {
  const swings = [];
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i];
    const neighbors = candles.slice(i - left, i + right + 1);
    const highs = neighbors.map((x) => x.high);
    const lows = neighbors.map((x) => x.low);
    if (c.high === Math.max(...highs) && highs.filter((v) => v === c.high).length === 1) {
      swings.push({ type: "HIGH", price: c.high, index: i, openTime: c.openTime });
    }
    if (c.low === Math.min(...lows) && lows.filter((v) => v === c.low).length === 1) {
      swings.push({ type: "LOW", price: c.low, index: i, openTime: c.openTime });
    }
  }
  return swings;
};

const getMarketStructureV3 = (candles) => {
  if (!candles || candles.length < 60) {
    return { trend: "unknown", regime: "unknown", bos: null, choch: null, swings: [] };
  }

  const recent = candles.slice(-240);
  const swings = findSwings(recent, 3, 3);
  const highs = swings.filter((s) => s.type === "HIGH");
  const lows = swings.filter((s) => s.type === "LOW");

  if (highs.length < 2 || lows.length < 2) {
    return { trend: "sideways", regime: "range", bos: null, choch: null, swings };
  }

  const lastHigh = highs.at(-1);
  const prevHigh = highs.at(-2);
  const lastLow = lows.at(-1);
  const prevLow = lows.at(-2);
  const current = recent.at(-1);
  const previous = recent.at(-2);

  const hh = lastHigh.price > prevHigh.price;
  const hl = lastLow.price > prevLow.price;
  const lh = lastHigh.price < prevHigh.price;
  const ll = lastLow.price < prevLow.price;

  let trend = "sideways";
  if (hh && hl) trend = "bullish";
  else if (lh && ll) trend = "bearish";
  else if (hl && !ll) trend = "bullish-transition";
  else if (lh && !hh) trend = "bearish-transition";

  const bullishBreakHigh = previous.close <= lastHigh.price && current.close > lastHigh.price;
  const bearishBreakLow = previous.close >= lastLow.price && current.close < lastLow.price;

  let bos = null;
  let choch = null;

  if ((trend === "bullish" || trend === "bullish-transition") && bullishBreakHigh) bos = "bullish";
  if ((trend === "bearish" || trend === "bearish-transition") && bearishBreakLow) bos = "bearish";

  if ((trend === "bearish" || trend === "bearish-transition") && bullishBreakHigh) choch = "bullish";
  if ((trend === "bullish" || trend === "bullish-transition") && bearishBreakLow) choch = "bearish";

  const swingRange = Math.max(lastHigh.price - lastLow.price, Number.EPSILON);
  const midpoint = lastLow.price + swingRange / 2;
  const position = (current.close - lastLow.price) / swingRange;

  let regime = "range";
  if (trend === "bullish" && current.close >= midpoint) regime = "trend-up";
  else if (trend === "bearish" && current.close <= midpoint) regime = "trend-down";
  else if (trend.includes("transition")) regime = "transition";

  return {
    trend,
    regime,
    bos,
    choch,
    lastHigh,
    prevHigh,
    lastLow,
    prevLow,
    midpoint,
    position,
    swings,
  };
};

export default getMarketStructureV3;
