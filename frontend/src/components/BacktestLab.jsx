import { useState } from "react";
import api from "../services/api";

const Metric = ({ label, value, accent = false }) => (
  <div className={`lab-metric ${accent ? "lab-metric-accent" : ""}`}>
    <span>{label}</span>
    <strong>{value ?? "—"}</strong>
  </div>
);

const BacktestLab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runBacktest = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/backtest");
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="strategy-lab glass-panel">
      <div className="strategy-lab-head">
        <div>
          <div className="eyebrow">RESEARCH MODE</div>
          <h2>Strategy Lab</h2>
          <p>Run the current BTC signal engine across stored 15m candles with V2 execution rules.</p>
        </div>
        <button className="run-backtest-btn" onClick={runBacktest} disabled={loading}>
          <span className="run-dot" />
          {loading ? "Running historical simulation..." : "Run V2 Backtest"}
        </button>
      </div>

      {error && <div className="lab-error">{error}</div>}

      {!data && !error && (
        <div className="lab-idle">
          <div className="orbital-loader"><span /></div>
          <div>
            <strong>Historical engine ready</strong>
            <p>Click run to measure win rate, expectancy, profit factor and direction performance.</p>
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="lab-version-row">
            <span>{data.backtestVersion || "backtest"}</span>
            <span>{data.candleCount?.toLocaleString()} candles</span>
            <span>{data.trades} completed trades</span>
          </div>

          <div className="lab-metrics-grid">
            <Metric label="Win Rate" value={`${data.winRate}%`} accent />
            <Metric label="Expectancy" value={`${data.expectancyR} R`} />
            <Metric label="Profit Factor" value={data.profitFactor} />
            <Metric label="Total R" value={`${data.totalR} R`} />
            <Metric label="TP2 Wins" value={data.tp2Wins} />
            <Metric label="Losses" value={data.losses} />
          </div>

          <div className="direction-grid">
            {["BUY", "SELL"].map((direction) => {
              const row = data.byDirection?.[direction] || {};
              return (
                <div key={direction} className={`direction-card ${direction.toLowerCase()}`}>
                  <div className="direction-title">
                    <span>{direction}</span>
                    <strong>{row.winRate ?? 0}%</strong>
                  </div>
                  <div className="direction-bar"><span style={{ width: `${Math.min(row.winRate || 0, 100)}%` }} /></div>
                  <div className="direction-meta">
                    <span>{row.trades ?? 0} trades</span>
                    <span>{row.expectancyR ?? 0} R expectancy</span>
                    <span>{row.totalR ?? 0} R total</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lab-footnote">
            <span>Unfilled signals: {data.unfilled ?? 0}</span>
            <span>Ambiguous candles: {data.ambiguousBars ?? 0}</span>
            <span>Unresolved: {data.unresolved ?? 0}</span>
          </div>
        </>
      )}
    </section>
  );
};

export default BacktestLab;
