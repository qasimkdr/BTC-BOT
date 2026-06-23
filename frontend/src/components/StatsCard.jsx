import { useEffect, useState } from "react";
import api from "../services/api";

const StatsCard = () => {
  const [stats, setStats] =
    useState(null);

  useEffect(() => {
    const loadStats =
      async () => {
        try {
          const res =
            await api.get(
              "/stats"
            );

          setStats(
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

    loadStats();

    const interval =
      setInterval(
        loadStats,
        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  if (!stats) {
    return (
      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4">
        Bot Statistics
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <div>
          <p className="text-zinc-400">
            Trades
          </p>

          <p className="text-2xl font-bold">
            {
              stats.totalTrades
            }
          </p>
        </div>

        <div>
          <p className="text-zinc-400">
            Win Rate
          </p>

          <p className="text-2xl font-bold text-green-500">
            {
              stats.winRate
            }
            %
          </p>
        </div>

        <div>
          <p className="text-zinc-400">
            Wins
          </p>

          <p className="text-xl font-bold text-green-500">
            {
              stats.wins
            }
          </p>
        </div>

        <div>
          <p className="text-zinc-400">
            Losses
          </p>

          <p className="text-xl font-bold text-red-500">
            {
              stats.losses
            }
          </p>
        </div>

        <div>
          <p className="text-zinc-400">
            Open
          </p>

          <p className="text-xl font-bold">
            {
              stats.openTrades
            }
          </p>
        </div>

        <div>
          <p className="text-zinc-400">
            Profit Factor
          </p>

          <p className="text-xl font-bold">
            {
              stats.profitFactor
            }
          </p>
        </div>

        <div>
          <p className="text-zinc-400">
            Total PnL
          </p>

          <p className="text-xl font-bold">
            {
              stats.totalPnL
            }
          </p>
        </div>

        <div>
          <p className="text-zinc-400">
            Avg Win
          </p>

          <p className="text-xl font-bold">
            {
              stats.averageWin
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;