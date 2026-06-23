const calculateEMA = (
  candles,
  period = 200
) => {
  if (
    candles.length <
    period
  ) {
    return null;
  }

  const k =
    2 / (period + 1);

  let ema =
    candles[0].close;

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    ema =
      candles[i]
        .close *
        k +
      ema *
        (1 - k);
  }

  return ema;
};

export default calculateEMA;