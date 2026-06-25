import WebSocket from "ws";

import Candle15m from "../../models/Candle15m.js";

import signalScannerJob from "../../jobs/signalScannerJob.js";

import monitorTrades from "../../services/trade/monitorTrades.js";

import {
  getIO,
} from "../../socket/socketServer.js";

import signalEngine from "../analysis/signalEngine.js";
import sendTelegramAlert from "../alerts/telegram.js"

let reconnectTimeout;
const alertMemory = {};

const startMexcWebSocket =
  () => {
    console.log(
      "Connecting to Binance WebSocket..."
    );

    const ws =
      new WebSocket(
        "wss://stream.binance.com:9443/ws/btcusdt@kline_15m"
      );

    ws.on(
      "open",
      () => {
        console.log(
          "✅ Binance WebSocket Connected"
        );
      }
    );

    ws.on(
      "message",
      async (data) => {
        try {
          const parsed =
            JSON.parse(
              data.toString()
            );

          if (
            parsed.e !==
            "kline"
          ) {
            return;
          }

          const kline =
            parsed.k;

          const currentPrice =
            Number(
              kline.c
            );

          const io =
            getIO();

          if (io) {
            io.emit(
              "price-update",
              {
                price:
                  currentPrice,

                symbol:
                  kline.s,

                volume:
                  kline.v,
              }
            );

            const remainingSeconds =
  Math.floor(
    (kline.T - Date.now()) /
      1000
  );

io.emit(
  "countdown-update",
  {
    remainingSeconds,
  }
);

            io.emit(
              "candle-update",
              {
                time:
                  Math.floor(
                    kline.t /
                      1000
                  ),

                open:
                  Number(
                    kline.o
                  ),

                high:
                  Number(
                    kline.h
                  ),

                low:
                  Number(
                    kline.l
                  ),

                close:
                  Number(
                    kline.c
                  ),
              }
            );
          }

          await monitorTrades(
            currentPrice
          );

          if (!kline.x) {

  const candles =
  await Candle15m.find()
    .sort({
      openTime: -1,
    })
    .limit(500);

candles.reverse();

  const liveCandle = {
    symbol: kline.s,

    openTime: kline.t,

    open: Number(kline.o),

    high: Number(kline.h),

    low: Number(kline.l),

    close: Number(kline.c),

    volume: Number(kline.v),

    closeTime: kline.T,
  };

  const signal =
    signalEngine([
      ...candles,
      liveCandle,
    ]);

  const remainingSeconds =
    Math.floor(
      (kline.T -
        Date.now()) /
        1000
    );

  const candleId =
    kline.t;

  // 2 MIN ALERT
  if (
    signal.signal !==
      "NONE" &&
    remainingSeconds <=
      120 &&
    !alertMemory[
      `${candleId}-120`
    ]
  ) {
    alertMemory[
      `${candleId}-120`
    ] = true;

    console.log(
      "🔔 2 MIN ALERT"
    );

    io?.emit(
      "trade-alert",
      {
        type: "2MIN",
        signal,
      }
    );

    await sendTelegramAlert(
      signal,
      "2MIN",
      remainingSeconds
    );
  }

  // 1 MIN ALERT
  if (
    signal.signal !==
      "NONE" &&
    remainingSeconds <=
      60 &&
    !alertMemory[
      `${candleId}-60`
    ]
  ) {
    alertMemory[
      `${candleId}-60`
    ] = true;

    console.log(
      "⚡ 1 MIN ALERT"
    );

    io?.emit(
      "trade-alert",
      {
        type: "1MIN",
        signal,
      }
    );

    await sendTelegramAlert(
      signal,
      "1MIN",
      remainingSeconds
    );
  }

  // 15 SEC ALERT
  if (
    signal.signal !==
      "NONE" &&
    remainingSeconds <=
      15 &&
    !alertMemory[
      `${candleId}-15`
    ]
  ) {
    alertMemory[
      `${candleId}-15`
    ] = true;

    console.log(
      "🚨 15 SEC ALERT"
    );

    io?.emit(
      "trade-alert",
      {
        type: "15SEC",
        signal,
      }
    );

    await sendTelegramAlert(
      signal,
      "15SEC",
      remainingSeconds
    );
  }

  return;
}

          console.log(
            "🕯️ Candle Closed"
          );

          const exists =
            await Candle15m.findOne(
              {
                openTime:
                  kline.t,
              }
            );

          if (
            exists
          ) {
            return;
          }

          await Candle15m.create(
            {
              symbol:
                kline.s,

              openTime:
                kline.t,

              open:
                Number(
                  kline.o
                ),

              high:
                Number(
                  kline.h
                ),

              low:
                Number(
                  kline.l
                ),

              close:
                Number(
                  kline.c
                ),

              volume:
                Number(
                  kline.v
                ),

              closeTime:
                kline.T,
            }
          );

          console.log(
  "✅ Candle Saved:",
  new Date(kline.T)
);

          await signalScannerJob();
        } catch (
          error
        ) {
          console.error(
            error.message
          );
        }
      }
    );

    ws.on(
      "close",
      () => {
        console.log(
          "❌ WebSocket Closed"
        );

        clearTimeout(
          reconnectTimeout
        );

        reconnectTimeout =
          setTimeout(
            () => {
              startMexcWebSocket();
            },
            5000
          );
      }
    );

    ws.on(
      "error",
      (
        error
      ) => {
        console.error(
          error.message
        );
      }
    );

    return ws;
  };

export default startMexcWebSocket;