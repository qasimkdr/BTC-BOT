import {
  useEffect,
  useState,
} from "react";

import api from "../services/api";

import socket from "../socket/socket";

const SignalCard = () => {
  const [signal, setSignal] =
    useState(null);

  const [countdown, setCountdown] =
    useState(0);

  const [lastSignal, setLastSignal] =
    useState(null);

  const loadSignal =
    async () => {
      try {
        const res =
          await api.get(
            "/signals/current"
          );

        setSignal(
          res.data
        );

        if (
          res.data.signal !==
            "NONE" &&
          res.data.signal !==
            lastSignal
        ) {
          if (
            Notification.permission ===
            "granted"
          ) {
            new Notification(
              `BTC ${res.data.signal}`,
              {
                body:
                  `Score ${res.data.score}`,
              }
            );
          }

          setLastSignal(
            res.data.signal
          );
        }
      } catch (
        error
      ) {
        console.error(
          error
        );
      }
    };

  useEffect(() => {
    Notification.requestPermission();

    loadSignal();

    const interval =
      setInterval(
        loadSignal,
        15000
      );

    socket.on(
      "countdown-update",
      (data) => {
        setCountdown(
          data.remainingSeconds
        );
      }
    );

    return () => {
      clearInterval(
        interval
      );

      socket.off(
        "countdown-update"
      );
    };
  }, []);

  if (!signal) {
    return (
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">

      <h2 className="text-2xl font-bold mb-5">
        Live Signal
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-zinc-800 p-4 rounded-lg">
          <p className="text-zinc-400">
            Signal
          </p>

          <p
            className={`text-3xl font-bold ${
              signal.signal ===
              "BUY"
                ? "text-green-400"
                : signal.signal ===
                  "SELL"
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {signal.signal}
          </p>

          <p>
            Score:
            {" "}
            {signal.score}
          </p>
        </div>

        <div className="bg-zinc-800 p-4 rounded-lg">
          <p className="text-zinc-400">
            Price
          </p>

          <p className="text-xl">
            {
              signal.currentPrice
            }
          </p>

          <p>
            EMA:
            {" "}
            {Math.round(
              signal.ema200
            )}
          </p>
        </div>

        <div className="bg-zinc-800 p-4 rounded-lg">
          <p className="text-zinc-400">
            Entry
          </p>

          <p>
            {signal.entry}
          </p>

          <p className="text-red-400">
            SL:
            {" "}
            {
              signal.stopLoss
            }
          </p>
        </div>

        <div className="bg-zinc-800 p-4 rounded-lg">
          <p className="text-zinc-400">
            Targets
          </p>

          <p className="text-green-400">
            TP1:
            {" "}
            {
              signal.takeProfit1
            }
          </p>

          <p className="text-green-400">
            TP2:
            {" "}
            {
              signal.takeProfit2
            }
          </p>
        </div>

      </div>

      <div className="mt-5 bg-zinc-800 p-4 rounded-lg">

        <h3 className="font-bold mb-2">
          Candle Countdown
        </h3>

        <p className="text-2xl text-yellow-400">
          {Math.floor(
            countdown / 60
          )}
          :
          {String(
            countdown % 60
          ).padStart(
            2,
            "0"
          )}
        </p>

      </div>

      <div className="mt-5">

        <h3 className="font-bold mb-3">
          Conditions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

          {Object.entries(
            signal.conditions ||
              {}
          ).map(
            (
              [
                key,
                value,
              ]
            ) => (
              <div
                key={key}
                className="bg-zinc-800 p-3 rounded-lg flex justify-between"
              >
                <span>
                  {key}
                </span>

                <span
                  className={
                    value
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {value
                    ? "✅"
                    : "❌"}
                </span>
              </div>
            )
          )}

        </div>

      </div>

      <div
        className={`mt-5 p-4 rounded-lg text-center font-bold ${
          signal.signal !==
          "NONE"
            ? "bg-green-900 text-green-300"
            : "bg-red-900 text-red-300"
        }`}
      >
        {signal.signal !==
        "NONE"
          ? "🚀 TRADE READY"
          : "⛔ NO TRADE"}
      </div>

    </div>
  );
};

export default SignalCard;