import mexcApi from "../../config/mexc.js";

const fetchCandles = async (
  symbol = "BTCUSDT",
  interval = "15m",
  limit = 1000
) => {
  try {
    const { data } = await mexcApi.get(
      "/api/v3/klines",
      {
        params: {
          symbol,
          interval,
          limit,
        },
      }
    );

    return data;
  } catch (error) {
    console.error(error.message);
    return [];
  }
};

export default fetchCandles;