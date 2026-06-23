const volumeAnalysis = (
  candles
) => {
  if (
    !candles ||
    candles.length < 21
  ) {
    return {
      volumeSpike: false,
    };
  }

  const current =
    candles[
      candles.length - 1
    ];

  const previous =
    candles.slice(
      -21,
      -1
    );

  const averageVolume =
    previous.reduce(
      (
        sum,
        candle
      ) =>
        sum +
        candle.volume,
      0
    ) /
    previous.length;

  const ratio =
    current.volume /
    averageVolume;

  return {
    currentVolume:
      current.volume,

    averageVolume,

    ratio,

    volumeSpike:
      ratio >= 1.2,
  };
};

export default volumeAnalysis;