import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";

const ActiveTradeCard = () => {
  const [trade, setTrade] =
    useState(null);

  const [price, setPrice] =
    useState(null);

  const [duration, setDuration] =
    useState("");

  useEffect(() => {
    const loadTrade =
      async () => {
        try {
          const res =
            await api.get(
              "/trades/active"
            );

          setTrade(
            res.data
          );
        } catch (
          error
        ) {
          console.error(
            error
          );
        }
      };

    loadTrade();

    socket.on(
      "price-update",
      (data) => {
        setPrice(
          data.price
        );
      }
    );

    const refresh =
      setInterval(
        loadTrade,
        5000
      );

    const timer =
      setInterval(() => {
        if (!trade) return;

        const seconds =
          Math.floor(
            (Date.now() -
              trade.openTime) /
              1000
          );

        const h =
          Math.floor(
            seconds / 3600
          );

        const m =
          Math.floor(
            (seconds % 3600) /
              60
          );

        const s =
          seconds % 60;

        setDuration(
          `${h}h ${m}m ${s}s`
        );
      }, 1000);

    return () => {
      clearInterval(
        refresh
      );

      clearInterval(
        timer
      );

      socket.off(
        "price-update"
      );
    };
  }, [trade]);

  if (!trade) {
    return (
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        No Active Trade
      </div>
    );
  }

  const livePrice =
    price ??
    trade.currentPrice;

  const pnl =
    livePrice &&
    trade.signal === "BUY"
      ? (
          livePrice -
          trade.entry
        ).toFixed(2)
      : livePrice
      ? (
          trade.entry -
          livePrice
        ).toFixed(2)
      : 0;

  const rr =
    (
      trade.rewardPoints /
      trade.riskPoints
    ).toFixed(2);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">

      <h2 className="text-2xl font-bold mb-5">
        Active Trade
      </h2>

      <div className="grid md:grid-cols-2 gap-4">

        <div className="bg-zinc-800 rounded-lg p-4">

          <h3 className="font-bold mb-3">
            Trade Details
          </h3>

          <div className="space-y-2">

            <p>
              Signal:
              <span
                className={`ml-2 font-bold ${
                  trade.signal ===
                  "BUY"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.signal}
              </span>
            </p>

            <p>
              Entry:
              <span className="ml-2">
                {trade.entry?.toFixed(
                  2
                )}
              </span>
            </p>

            <p>
              Current:
              <span className="ml-2">
                {livePrice}
              </span>
            </p>

            <p>
              Stop Loss:
              <span className="ml-2 text-red-400">
                {trade.stopLoss?.toFixed(
                  2
                )}
              </span>
            </p>

            <p>
              TP1:
              <span className="ml-2 text-green-400">
                {trade.takeProfit1?.toFixed(
                  2
                )}
              </span>
            </p>

            <p>
              TP2:
              <span className="ml-2 text-green-400">
                {trade.takeProfit2?.toFixed(
                  2
                )}
              </span>
            </p>

            <p>
              Score:
              <span className="ml-2 font-bold">
                {trade.score}%
              </span>
            </p>

            <p>
              Risk :
              Reward
              <span className="ml-2 font-bold">
                1 :
                {rr}
              </span>
            </p>

            <p>
              Live PnL:
              <span
                className={`ml-2 font-bold ${
                  Number(
                    pnl
                  ) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {pnl}
              </span>
            </p>

          </div>

        </div>

        <div className="bg-zinc-800 rounded-lg p-4">

          <h3 className="font-bold mb-3">
            Trade Status
          </h3>

          <div className="space-y-2">

            <p>
              Status:
              <span
                className={`ml-2 font-bold ${
                  trade.status ===
                  "ACTIVE"
                    ? "text-yellow-400"
                    : "text-zinc-300"
                }`}
              >
                {trade.status}
              </span>
            </p>

            <p>
              Result:
              <span className="ml-2">
                {trade.result}
              </span>
            </p>

            <p>
              Journey:
              <span className="ml-2">
                {trade.tradeJourney}
              </span>
            </p>

            <p>
              Duration:
              <span className="ml-2 text-cyan-400">
                {duration}
              </span>
            </p>

            <p>
              TP1 Hit:
              <span
                className={`ml-2 ${
                  trade.tp1Hit
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.tp1Hit
                  ? "YES"
                  : "NO"}
              </span>
            </p>

            <p>
              TP2 Hit:
              <span
                className={`ml-2 ${
                  trade.tp2Hit
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.tp2Hit
                  ? "YES"
                  : "NO"}
              </span>
            </p>

          </div>

        </div>

      </div>
            <div className="grid md:grid-cols-2 gap-4 mt-5">

        <div className="bg-zinc-800 rounded-lg p-4">

          <h3 className="font-bold mb-3">
            Trade Analytics
          </h3>

          <div className="space-y-2">

            <p>
              Highest Profit:
              <span className="ml-2 text-green-400 font-bold">
                +{trade.highestProfitPoints?.toFixed(2)}
              </span>
            </p>

            <p>
              Highest Drawdown:
              <span className="ml-2 text-red-400 font-bold">
                -{trade.lowestDrawdownPoints?.toFixed(2)}
              </span>
            </p>

            <p>
              Max Favorable Price:
              <span className="ml-2 text-green-400">
                {trade.maxFavorablePrice?.toFixed(2)}
              </span>
            </p>

            <p>
              Max Adverse Price:
              <span className="ml-2 text-red-400">
                {trade.maxAdversePrice?.toFixed(2)}
              </span>
            </p>

            <p>
              Risk:
              <span className="ml-2">
                {trade.riskPoints?.toFixed(2)}
              </span>
            </p>

            <p>
              Reward:
              <span className="ml-2">
                {trade.rewardPoints?.toFixed(2)}
              </span>
            </p>

          </div>

        </div>

        <div className="bg-zinc-800 rounded-lg p-4">

          <h3 className="font-bold mb-3">
            Signal Snapshot
          </h3>

          <div className="space-y-2">

            <p>
              Trend:
              <span
                className={`ml-2 font-bold ${
                  trade.trend === "bullish"
                    ? "text-green-400"
                    : trade.trend === "bearish"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              >
                {trade.trend}
              </span>
            </p>

            <p>
              Buy Pressure:
              <span className="ml-2 text-green-400">
                {trade.buyPressure}%
              </span>
            </p>

            <p>
              Sell Pressure:
              <span className="ml-2 text-red-400">
                {trade.sellPressure}%
              </span>
            </p>

            <p>
              Bullish EMA:
              <span
                className={`ml-2 ${
                  trade.bullishEMA
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.bullishEMA ? "YES" : "NO"}
              </span>
            </p>

            <p>
              Bearish EMA:
              <span
                className={`ml-2 ${
                  trade.bearishEMA
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.bearishEMA ? "YES" : "NO"}
              </span>
            </p>

            <p>
              Volume Spike:
              <span
                className={`ml-2 ${
                  trade.volumeSpike
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.volumeSpike ? "YES" : "NO"}
              </span>
            </p>

            <p>
              Liquidity:
              <span
                className={`ml-2 ${
                  trade.liquidity
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {trade.liquidity ? "YES" : "NO"}
              </span>
            </p>

            <p>
              Session:
              <span
                className={`ml-2 ${
                  trade.session
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.session ? "ACTIVE" : "OFF"}
              </span>
            </p>

          </div>

        </div>

      </div>

      <div className="mt-5 bg-zinc-800 rounded-lg p-4">

        <h3 className="font-bold mb-3">
          Progress
        </h3>

        <div className="grid grid-cols-2 gap-4">

          <div>
            <p className="text-zinc-400">
              TP1
            </p>

            <p
              className={`font-bold ${
                trade.tp1Hit
                  ? "text-green-400"
                  : "text-yellow-400"
              }`}
            >
              {trade.tp1Hit
                ? "✅ HIT"
                : "⏳ Waiting"}
            </p>
          </div>

          <div>
            <p className="text-zinc-400">
              TP2
            </p>

            <p
              className={`font-bold ${
                trade.tp2Hit
                  ? "text-green-400"
                  : "text-yellow-400"
              }`}
            >
              {trade.tp2Hit
                ? "✅ HIT"
                : "⏳ Waiting"}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ActiveTradeCard;
