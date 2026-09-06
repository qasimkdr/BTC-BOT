import { useEffect, useState } from "react";
import api from "../services/api";

const Stat = ({ label, value, suffix = "", className = "" }) => (
  <div>
    <p className="text-zinc-400">{label}</p>
    <p className={`text-xl font-bold ${className}`}>{value ?? 0}{suffix}</p>
  </div>
);

const V2LiveStatsCard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/stats/v2-live");
        setStats(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <div className="eyebrow">FINALIZED LIVE V2</div>
          <h2 className="text-xl font-semibold">V2 TP1-Lock Performance</h2>
        </div>
        <span className="text-xs text-zinc-500">new V2 trades only</span>
      </div>

      {!stats ? <div>Loading...</div> : <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="All V2 Trades" value={stats.totalTrades} />
          <Stat label="Closed" value={stats.closedTrades} />
          <Stat label="Open" value={stats.openTrades} />
          <Stat label="Win Rate" value={stats.closedWinRate} suffix="%" className="text-green-500" />
          <Stat label="Wins" value={stats.wins} className="text-green-500" />
          <Stat label="Losses" value={stats.losses} className="text-red-500" />
          <Stat label="TP1 Lock Wins" value={stats.tp1LockWins} />
          <Stat label="TP2 Wins" value={stats.tp2Wins} />
          <Stat label="TP1 Hits" value={stats.tp1Hits} />
          <Stat label="Profit Factor" value={stats.profitFactor} />
          <Stat label="Expectancy / Trade" value={stats.expectancyPoints} suffix=" pts" />
          <Stat label="Total PnL" value={stats.totalPnL} suffix=" pts" />
        </div>
        <div className="lab-footnote mt-4">
          <span>Plan: TP1 hit → stop moves to TP1 → TP1 retest closes profit → TP2 remains +2R target.</span>
          <span>Statistics start from trades tagged v2-live-tp1-lock, so legacy trades are excluded.</span>
        </div>
      </>}
    </div>
  );
};

export default V2LiveStatsCard;
