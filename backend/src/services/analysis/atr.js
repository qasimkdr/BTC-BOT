const calculateATR = (
  candles,
  period = 14
) => {
  if (
    candles.length <
    period + 1
  ) {
    return 0;
  }

  const trs = [];

  for (
    let i = 1;
    i < candles.length;
    i++
  ) {
    const current =
      candles[i];

    const previous =
      candles[i - 1];

    const tr =
      Math.max(
        current.high -
          current.low,

        Math.abs(
          current.high -
            previous.close
        ),

        Math.abs(
          current.low -
            previous.close
        )
      );

    trs.push(tr);
  }

  const recentTRs =
    trs.slice(
      -period
    );

  return (
    recentTRs.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    ) / period
  );
};

export default calculateATR;