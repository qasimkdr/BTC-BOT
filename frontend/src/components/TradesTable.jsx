import { useEffect, useState } from "react";
import api from "../services/api";

const TradesTable = () => {
  const [trades, setTrades] =
    useState([]);

  useEffect(() => {
    const loadTrades =
      async () => {
        try {
          const res =
            await api.get(
              "/trades"
            );

          setTrades(
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

    loadTrades();

    const interval =
      setInterval(
        loadTrades,
        10000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Latest Trades
        </h2>

        <span className="text-sm text-zinc-400">
          {trades.length}/10
        </span>
      </div>

      <div className="overflow-x-auto">

        <table className="w-full min-w-[700px]">

          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">

              <th className="text-left py-3">
                Signal
              </th>

              <th className="text-left py-3">
                Entry
              </th>

              <th className="text-left py-3">
                Score
              </th>

              <th className="text-left py-3">
                Status
              </th>

              <th className="text-left py-3">
                Result
              </th>

              <th className="text-left py-3">
                PnL
              </th>

            </tr>
          </thead>

          <tbody>

            {trades.map(
              (trade) => (
                <tr
                  key={
                    trade._id
                  }
                  className="border-b border-zinc-800"
                >
                  <td className="py-3">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        trade.signal ===
                        "BUY"
                          ? "bg-green-900 text-green-400"
                          : "bg-red-900 text-red-400"
                      }`}
                    >
                      {
                        trade.signal
                      }
                    </span>

                  </td>

                  <td className="py-3">
                    {trade.entry?.toFixed(
                      2
                    )}
                  </td>

                  <td className="py-3">
                    {trade.score}
                  </td>

                  <td className="py-3">

                    <span
                      className={`font-semibold ${
                        trade.status ===
                        "ACTIVE"
                          ? "text-yellow-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {
                        trade.status
                      }
                    </span>

                  </td>

                  <td className="py-3">

                    <span
                      className={
                        trade.result?.includes(
                          "TP"
                        )
                          ? "text-green-400"
                          : trade.result ===
                            "SL_HIT"
                          ? "text-red-400"
                          : "text-zinc-300"
                      }
                    >
                      {
                        trade.result
                      }
                    </span>

                  </td>

                  <td
                    className={`py-3 font-semibold ${
                      trade.pnlPoints >
                      0
                        ? "text-green-400"
                        : trade.pnlPoints <
                          0
                        ? "text-red-400"
                        : "text-zinc-300"
                    }`}
                  >
                    {
                      trade.pnlPoints
                    }
                  </td>

                </tr>
              )
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default TradesTable;