import {
  useEffect,
  useState,
} from "react";

import api from "../services/api";
import socket from "../socket/socket";

const ConditionCard = ({
  title,
  score,
  conditions,
  color,
}) => {
  return (
    <div className="bg-zinc-800 p-4 rounded-lg">

      <div className="flex justify-between items-center mb-3">

        <h3
          className={`font-bold text-lg ${color}`}
        >
          {title}
        </h3>

        <span
          className={`font-bold text-xl ${color}`}
        >
          {score}%
        </span>

      </div>

      <div className="space-y-2">

        {Object.entries(
          conditions || {}
        ).map(
          ([key, value]) => (
            <div
              key={key}
              className="flex justify-between border-b border-zinc-700 pb-2"
            >
              <span>{key}</span>

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
  );
};

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
            "/signals/test"
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
                body: `Score ${res.data.score}`,
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
            Overall Score:
            {" "}
            {signal.score}%
          </p>

        </div>

        <div className="bg-zinc-800 p-4 rounded-lg">

          <p className="text-zinc-400">
            Price
          </p>

          <p className="text-xl">
            {signal.currentPrice}
          </p>

          <p>
            EMA200:
            {" "}
            {Math.round(
              signal.ema200
            )}
          </p>

          <p>
            ATR:
            {" "}
            {signal.atr?.toFixed(
              2
            )}
          </p>

        </div>

        <div className="bg-zinc-800 p-4 rounded-lg">

          <p>
            Entry
          </p>

          <p>
            {signal.entry}
          </p>

          <p className="text-red-400">
            SL:
            {" "}
            {signal.stopLoss}
          </p>

        </div>

        <div className="bg-zinc-800 p-4 rounded-lg">

          <p className="text-green-400">
            TP1:
            {" "}
            {signal.takeProfit1}
          </p>

          <p className="text-green-400">
            TP2:
            {" "}
            {signal.takeProfit2}
          </p>

        </div>

      </div>

      <div className="mt-5 bg-zinc-800 p-4 rounded-lg">

        <div className="flex justify-between mb-2">

          <span className="text-green-400">
            BUY Pressure {signal.buyPressure}%
          </span>

          <span className="text-red-400">
            SELL Pressure {signal.sellPressure}%
          </span>

        </div>

        <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden flex">

          <div
            className="bg-green-500"
            style={{
              width: `${signal.buyPressure}%`,
            }}
          />

          <div
            className="bg-red-500"
            style={{
              width: `${signal.sellPressure}%`,
            }}
          />

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">

        <ConditionCard
          title="🟢 BUY ANALYSIS"
          score={
            signal.buyScore
          }
          conditions={
            signal.buyConditions
          }
          color="text-green-400"
        />

        <ConditionCard
          title="🔴 SELL ANALYSIS"
          score={
            signal.sellScore
          }
          conditions={
            signal.sellConditions
          }
          color="text-red-400"
        />

      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">

        <div className="bg-zinc-800 rounded-lg p-4">

          <h3 className="font-bold mb-3">
            Market Structure
          </h3>

          <div className="space-y-2">

            <p>
              Trend:
              <span
                className={`ml-2 font-bold ${
                  signal.trend ===
                  "bullish"
                    ? "text-green-400"
                    : signal.trend ===
                      "bearish"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              >
                {signal.trend}
              </span>
            </p>

            <p>
              BOS:
              <span className="ml-2">
                {signal.bos ??
                  "-"}
              </span>
            </p>

            <p>
              CHOCH:
              <span className="ml-2">
                {signal.choch ??
                  "-"}
              </span>
            </p>

            <p>
              Liquidity:
              <span
                className={`ml-2 ${
                  signal.liquidity
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {signal.liquidity
                  ? signal.liquidityType
                  : "None"}
              </span>
            </p>

          </div>

        </div>

        <div className="bg-zinc-800 rounded-lg p-4">

          <h3 className="font-bold mb-3">
            Volume & Session
          </h3>

          <div className="space-y-2">

            <p>
              Volume Spike:
              <span
                className={`ml-2 ${
                  signal.volumeSpike
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {signal.volumeSpike
                  ? "YES"
                  : "NO"}
              </span>
            </p>

            <p>
              Volume Ratio:
              <span className="ml-2">
                {signal.volumeRatio?.toFixed(
                  2
                )}
              </span>
            </p>

            <p>
              Session:
              <span
                className={`ml-2 ${
                  signal.session
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {signal.session
                  ? "ACTIVE"
                  : "CLOSED"}
              </span>
            </p>

          </div>

        </div>

      </div>

      <div
        className={`mt-5 p-5 rounded-lg text-center font-bold text-xl ${
          signal.signal ===
          "BUY"
            ? "bg-green-900 text-green-300"
            : signal.signal ===
              "SELL"
            ? "bg-red-900 text-red-300"
            : "bg-yellow-900 text-yellow-300"
        }`}
      >
        {signal.signal ===
        "NONE"
          ? "⛔ NO TRADE AVAILABLE"
          : `🚀 ${signal.signal} TRADE READY`}
      </div>

    </div>
  );
};

export default SignalCard;
