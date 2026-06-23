const getMarketStructure = (
  candles
) => {
  if (
    !candles ||
    candles.length < 30
  ) {
    return {
      trend: "unknown",
      bos: null,
      choch: null,
      swings: [],
    };
  }

  const swings = [];

  for (
    let i = 2;
    i < candles.length - 2;
    i++
  ) {
    const current =
      candles[i];

    const isSwingHigh =
      current.high >
        candles[i - 1]
          .high &&
      current.high >
        candles[i - 2]
          .high &&
      current.high >
        candles[i + 1]
          .high &&
      current.high >
        candles[i + 2]
          .high;

    const isSwingLow =
      current.low <
        candles[i - 1]
          .low &&
      current.low <
        candles[i - 2]
          .low &&
      current.low <
        candles[i + 1]
          .low &&
      current.low <
        candles[i + 2]
          .low;

    if (isSwingHigh) {
      swings.push({
        type: "HIGH",
        price:
          current.high,
        openTime:
          current.openTime,
      });
    }

    if (isSwingLow) {
      swings.push({
        type: "LOW",
        price:
          current.low,
        openTime:
          current.openTime,
      });
    }
  }

  const highs =
    swings.filter(
      (s) =>
        s.type ===
        "HIGH"
    );

  const lows =
    swings.filter(
      (s) =>
        s.type ===
        "LOW"
    );

  if (
    highs.length < 3 ||
    lows.length < 3
  ) {
    return {
      trend: "unknown",
      bos: null,
      choch: null,
      swings,
    };
  }

  const lastHigh =
    highs[
      highs.length - 1
    ];

  const prevHigh =
    highs[
      highs.length - 2
    ];

  const lastLow =
    lows[
      lows.length - 1
    ];

  const prevLow =
    lows[
      lows.length - 2
    ];

    const highChange =
  Math.abs(
    lastHigh.price -
    prevHigh.price
  );

const lowChange =
  Math.abs(
    lastLow.price -
    prevLow.price
  );

  let trend =
    "sideways";

  let bos = null;

  let choch =
    null;

  // Higher High + Higher Low
  if (
    lastHigh.price >
      prevHigh.price &&
    lastLow.price >
      prevLow.price
  ) {
    trend =
      "bullish";
  }

  // Lower High + Lower Low
  else if (
    lastHigh.price <
      prevHigh.price &&
    lastLow.price <
      prevLow.price
  ) {
    trend =
      "bearish";
  }

  const current =
    candles[
      candles.length - 1
    ];

  if (
    trend ===
      "bullish" &&
    current.close >
      lastHigh.price
  ) {
    bos =
      "bullish";
  }

  if (
    trend ===
      "bearish" &&
    current.close <
      lastLow.price
  ) {
    bos =
      "bearish";
  }

  if (
    trend ===
      "bearish" &&
    current.close >
      lastHigh.price
  ) {
    choch =
      "bullish";
  }

  if (
    trend ===
      "bullish" &&
    current.close <
      lastLow.price
  ) {
    choch =
      "bearish";
  }

  return {
    trend,
    bos,
    choch,
    lastHigh,
    prevHigh,
    lastLow,
    prevLow,
    swings,
  };
};

export default getMarketStructure;