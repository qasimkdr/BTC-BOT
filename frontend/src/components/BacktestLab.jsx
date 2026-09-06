import { useState } from "react";
import api from "../services/api";

const CACHE_KEY = "btc-bot-v2-backtest-10k";

const Metric = ({ label, value, accent = false }) => (
  <div className={`lab-metric ${accent ? "lab-metric-accent" : ""}`}>
    <span>{label}</span>
    <strong>{value ?? "—"}</strong>
  </div>
);

const readCachedBacktest = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const BacktestLab = () => {
  const cached = readCachedBacktest();
  const [data, setData] = useState(cached?.data || null);
  const [savedAt, setSavedAt] = useState(cached?.savedAt || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runBacktest = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/backtest");
      const stamp = new Date().toISOString();
      setData(response.data);
      setSavedAt(stamp);
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: response.data, savedAt: stamp })
      );
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
          <div className="eyebrow">RESEARCH MODE · LAST 10K CANDLES</div>
          <h2>Strategy Lab</h2>
          <p>
            Runs only the latest 10,000 stored 15m candles. Your last completed result is saved on this device and restored after refresh.
          </p>
        </div>
        <button className="run-backtest-btn" onClick={runBacktest} disabled={loading}>
          <span className="run-dot" />
          {loading ? "Testing latest 10k..." : data ? "Re-run latest 10k" : "Run latest 10k"}
        </button>
      </div>

      {error && <div className="lab-error">{error}</div>}

      {!data && !error && (
        <div className="lab-idle">
          <div className="orbital-loader"><span /></div>
          <div>
            <strong>10k historical window ready</strong>
            <p>Run once. The result will stay visible after page reloads until you run a newer test.</p>
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="lab-version-row">
            <span>{data.backtestVersion || "backtest"}</span>
            <span>{data.candleCount?.toLocaleString()} / 10,000 candles</span>
            <span>{data.trades} completed trades</span>
            {savedAt && <span>Saved {new Date(savedAt).toLocaleString()}</span>}
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
