const confidenceScore = ({
  trend,
  liquidity,
  volume,
  session,
}) => {
  let score = 0;

  if (
    trend === "bullish" ||
    trend === "bearish"
  ) {
    score += 30;
  }

  if (
    trend === "bullish" &&
    liquidity.detected &&
    liquidity.type === "bullish"
  ) {
    score += 30;
  }

  if (
    trend === "bearish" &&
    liquidity.detected &&
    liquidity.type === "bearish"
  ) {
    score += 30;
  }

  if (volume.volumeSpike) {
    score += 20;
  }

  if (session.validTradingTime) {
    score += 20;
  }

  return score;
};

export default confidenceScore;