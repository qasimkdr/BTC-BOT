const sessionFilterV3 = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  const utcHour = date.getUTCHours();
  const day = date.getUTCDay();
  const weekend = day === 0 || day === 6;

  const asia = utcHour >= 0 && utcHour < 8;
  const london = utcHour >= 7 && utcHour < 13;
  const newYork = utcHour >= 12 && utcHour < 20;
  const overlap = utcHour >= 12 && utcHour < 16;

  let activityScore = 45;
  if (asia) activityScore = 50;
  if (london) activityScore = 65;
  if (newYork) activityScore = 70;
  if (overlap) activityScore = 80;
  if (weekend) activityScore -= 10;

  return {
    utcHour,
    dayOfWeek: day,
    weekend,
    asia,
    london,
    newYork,
    overlap,
    activityScore,
    activeWindow: overlap ? "overlap" : newYork ? "new-york" : london ? "london" : asia ? "asia" : "off-peak",
    // BTC trades continuously; this is context, not a hard permission gate.
    validTradingTime: true,
  };
};

export default sessionFilterV3;
