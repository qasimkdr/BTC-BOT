import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";

const ActiveTradeCard = () => {
  const [trade, setTrade] =
    useState(null);

  const [price, setPrice] =
    useState(null);

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

    const interval =
      setInterval(
        loadTrade,
        5000
      );

    return () => {
      clearInterval(
        interval
      );

      socket.off(
        "price-update"
      );
    };
  }, []);

  if (!trade) {
    return (
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        No Active Trade
      </div>
    );
  }

  const pnl =
    price && trade.signal === "BUY"
      ? (
          price -
          trade.entry
        ).toFixed(2)
      : price
      ? (
          trade.entry -
          price
        ).toFixed(2)
      : 0;

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4">
        Active Trade
      </h2>

      <div className="space-y-2">

        <p>
          Signal:
          <strong>
            {" "}
            {
              trade.signal
            }
          </strong>
        </p>

        <p>
          Entry:
          <strong>
            {" "}
            {
              trade.entry
            }
          </strong>
        </p>

        <p>
          Current:
          <strong>
            {" "}
            {
              price
            }
          </strong>
        </p>

        <p>
          Stop Loss:
          <strong>
            {" "}
            {
              trade.stopLoss
            }
          </strong>
        </p>

        <p>
          TP1:
          <strong>
            {" "}
            {
              trade.takeProfit1
            }
          </strong>
        </p>

        <p>
          TP2:
          <strong>
            {" "}
            {
              trade.takeProfit2
            }
          </strong>
        </p>

        <p>
          Score:
          <strong>
            {" "}
            {
              trade.score
            }
          </strong>
        </p>

        <p>
          Live PnL:
          <strong
            className={
              Number(
                pnl
              ) >= 0
                ? "text-green-500"
                : "text-red-500"
            }
          >
            {" "}
            {pnl}
          </strong>
        </p>

      </div>
    </div>
  );
};

export default ActiveTradeCard;