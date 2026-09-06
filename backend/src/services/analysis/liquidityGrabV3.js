const detectLiquidityGrabV3 = (candles, structure, atr) => {
  if (!candles || candles.length < 50 || !atr) {
    return { detected: false, quality: 0 };
  }

  const current = candles.at(-1);
  const range = Math.max(current.high - current.low, Number.EPSILON);
  const bodyTop = Math.max(current.open, current.close);
  const bodyBottom = Math.min(current.open, current.close);
  const upperWick = current.high - bodyTop;
  const lowerWick = bodyBottom - current.low;

  const candidateLows = [structure?.lastLow, structure?.prevLow].filter(Boolean);
  const candidateHighs = [structure?.lastHigh, structure?.prevHigh].filter(Boolean);

  let best = { detected: false, quality: 0 };

  for (const level of candidateLows) {
    const swept = current.low < level.price && current.close > level.price;
    if (!swept) continue;
    const depthAtr = (level.price - current.low) / atr;
    const reclaimAtr = (current.close - level.price) / atr;
    const wickRatio = lowerWick / range;
    const quality = Math.min(100, Math.round(depthAtr * 35 + reclaimAtr * 45 + wickRatio * 40));
    if (quality > best.quality) {
      best = {
        detected: true,
        type: "bullish",
        sweptLevel: level.price,
        sweptSwingTime: level.openTime,
        depthAtr,
        reclaimAtr,
        wickRatio,
        quality,
      };
    }
  }

  for (const level of candidateHighs) {
    const swept = current.high > level.price && current.close < level.price;
    if (!swept) continue;
    const depthAtr = (current.high - level.price) / atr;
    const reclaimAtr = (level.price - current.close) / atr;
    const wickRatio = upperWick / range;
    const quality = Math.min(100, Math.round(depthAtr * 35 + reclaimAtr * 45 + wickRatio * 40));
    if (quality > best.quality) {
      best = {
        detected: true,
        type: "bearish",
        sweptLevel: level.price,
        sweptSwingTime: level.openTime,
        depthAtr,
        reclaimAtr,
        wickRatio,
        quality,
      };
    }
  }

  return best;
};

export default detectLiquidityGrabV3;
