import { useEffect, useState } from "react";
import api from "../services/api";

const Stat = ({ label, value, suffix = "", className = "" }) => (
  <div>
    <p className="text-zinc-400">{label}</p>
    <p className={`text-xl font-bold ${className}`}>
      {value ?? 0}{suffix}
    </p>
  </div>
);

const StatsCard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.get("/stats");
        setStats(res.data);
      } catch (error) {
        console.error(error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
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
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-xl font-semibold">Bot Statistics</h2>
        <span className="text-xs text-zinc-500">closed trades only for accuracy</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="All Trades" value={stats.totalTrades} />
        <Stat label="Closed Trades" value={stats.closedTrades} />
        <Stat label="Open Trades" value={stats.openTrades} />
        <Stat
          label="Closed Win Rate"
          value={stats.closedWinRate ?? stats.winRate}
          suffix="%"
          className="text-green-500"
        />
        <Stat label="Wins" value={stats.wins} className="text-green-500" />
        <Stat label="Losses" value={stats.losses} className="text-red-500" />
        <Stat label="Profit Factor" value={stats.profitFactor} />
        <Stat label="Expectancy / Trade" value={stats.expectancyPoints} />
        <Stat label="Total PnL" value={stats.totalPnL} />
        <Stat label="Avg Win" value={stats.averageWin} />
        <Stat label="Avg Loss" value={stats.averageLoss} />
        <Stat label="TP2 Hits" value={stats.tp2Hits} />
      </div>
    </div>
  );
};

export default StatsCard;
