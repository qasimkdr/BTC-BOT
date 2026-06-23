import Candle15m from "../models/Candle15m.js";

export const getCandles = async (
  req,
  res
) => {
  try {
    const candles =
      await Candle15m.find()
        .sort({
          openTime: 1,
        })
        .limit(500);

    res.json(candles);
  } catch (error) {
    res.status(500).json({
      message:
        error.message,
    });
  }
};