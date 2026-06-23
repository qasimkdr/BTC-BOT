const riskReward = (
  entry,
  stopLoss
) => {
  const risk =
    Math.abs(entry - stopLoss);

  return {
    risk,
    tp1: entry + risk * 2,
    tp2: entry + risk * 3,
  };
};

export default riskReward;