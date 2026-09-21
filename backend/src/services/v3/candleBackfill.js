import Candle15m from "../../models/Candle15m.js";
import Candle1h from "../../models/Candle1h.js";
import Candle4h from "../../models/Candle4h.js";

const frames = [
  { interval: "15m", model: Candle15m, limit: 250 },
  { interval: "1h", model: Candle1h, limit: 250 },
  { interval: "4h", model: Candle4h, limit: 250 },
];

async function fetchBinanceCandles(interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Binance ${interval} backfill failed: HTTP ${response.status}`);
  return response.json();
}

export async function backfillV3Candles() {
  for (const { interval, model, limit } of frames) {
    const rows = await fetchBinanceCandles(interval, limit);
    const closed = rows.filter(row => Number(row[6]) < Date.now());
    if (!closed.length) continue;

    await model.bulkWrite(closed.map(row => ({
      updateOne: {
        filter: { openTime: Number(row[0]) },
        update: { $set: {
          symbol: "BTCUSDT",
          openTime: Number(row[0]),
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5]),
          closeTime: Number(row[6]),
        }},
        upsert: true,
      },
    })), { ordered: false });

    const count = await model.countDocuments();
    console.log(`🕯️ V3 ${interval} candles ready: ${count}`);
  }
}
