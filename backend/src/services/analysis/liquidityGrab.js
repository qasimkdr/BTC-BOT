const detectLiquidityGrab = (
  candles
) => {
  if (
    !candles ||
    candles.length < 30
  ) {
    return {
      detected: false,
    };
  }

  const current =
    candles[
      candles.length - 1
    ];

  const lookback =
    candles.slice(
      -30,
      -1
    );

  const recentHigh =
    Math.max(
      ...lookback.map(
        (c) => c.high
      )
    );

  const recentLow =
    Math.min(
      ...lookback.map(
        (c) => c.low
      )
    );

  // Bullish sweep
  if (
    current.low <
      recentLow &&
    current.close >
      recentLow
  ) {
    return {
      detected: true,
      type: "bullish",
      sweptLevel:
        recentLow,
    };
  }

  // Bearish sweep
  if (
    current.high >
      recentHigh &&
    current.close <
      recentHigh
  ) {
    return {
      detected: true,
      type: "bearish",
      sweptLevel:
        recentHigh,
    };
  }

  return {
    detected: false,
  };
};

export default detectLiquidityGrab;