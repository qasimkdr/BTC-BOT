const sessionFilter = (
  timestamp = Date.now()
) => {
  const date =
    new Date(timestamp);

  const utcHour =
    date.getUTCHours();

  const london =
    utcHour >= 7 &&
    utcHour <= 11;

  const newYork =
    utcHour >= 13 &&
    utcHour <= 17;

  const overlap =
    utcHour >= 13 &&
    utcHour <= 16;

  return {
    london,
    newYork,
    overlap,

    validTradingTime:
      london ||
      newYork ||
      overlap,
  };
};

export default sessionFilter;