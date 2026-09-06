const volumeAnalysisV3 = (candles, period = 20) => {
  if (!candles || candles.length < period + 1) {
    return { ratio: 0, relativeVolume: 0, directionalBias: "neutral", pressure: 0, volumeSpike: false };
  }
  const current = candles.at(-1);
  const previous = candles.slice(-(period + 1), -1);
  const avg = previous.reduce((sum, c) => sum + Number(c.volume || 0), 0) / period;
  const ratio = avg > 0 ? Number(current.volume || 0) / avg : 0;

  const range = Math.max(current.high - current.low, Number.EPSILON);
  const body = current.close - current.open;
  const bodyRatioSigned = body / range;
  const closeLocation = (current.close - current.low) / range;

  let directionalBias = "neutral";
  if (bodyRatioSigned > 0.15 && closeLocation >= 0.6) directionalBias = "bullish";
  if (bodyRatioSigned < -0.15 && closeLocation <= 0.4) directionalBias = "bearish";

  const pressure = Math.max(-1, Math.min(1, bodyRatioSigned * Math.min(ratio, 2)));

  return {
    currentVolume: Number(current.volume || 0),
    averageVolume: avg,
    ratio,
    relativeVolume: ratio,
    directionalBias,
    pressure,
    volumeSpike: ratio >= 1.2,
    strongVolume: ratio >= 1.35,
    closeLocation,
    bodyRatioSigned,
  };
};

export default volumeAnalysisV3;
