import { useEffect, useState } from "react";
import api from "../services/api";

const TradesTable = () => {
  const [trades, setTrades] =
    useState([]);

  useEffect(() => {
    const loadTrades =
      async () => {
        const res =
          await api.get(
            "/trades"
          );

        setTrades(
          res.data
        );
      };

    loadTrades();
  }, []);

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4">
        Trades
      </h2>

      <table className="w-full">
        <thead>
          <tr>
            <th>Signal</th>
            <th>Entry</th>
            <th>Status</th>
            <th>Result</th>
          </tr>
        </thead>

        <tbody>
          {trades.map(
            (trade) => (
              <tr
                key={
                  trade._id
                }
              >
                <td>
                  {
                    trade.signal
                  }
                </td>

                <td>
                  {
                    trade.entry
                  }
                </td>

                <td>
                  {
                    trade.status
                  }
                </td>

                <td>
                  {
                    trade.result
                  }
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TradesTable;