import { useMemo, useState } from "react";
import api from "../services/api";

const CACHE_KEYS = {
  v1: "btc-bot-v1-backtest-10k",
  v2: "btc-bot-v2-backtest-10k",
  accuracy: "btc-bot-v2-accuracy-backtest-10k",
  v3: "btc-bot-v3-enhanced-backtest-10k",
};

const Metric = ({ label, value, accent = false }) => (
  <div className={`lab-metric ${accent ? "lab-metric-accent" : ""}`}>
    <span>{label}</span>
    <strong>{value ?? "—"}</strong>
  </div>
);

const readCachedBacktest = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ResultPanel = ({ title, badge, data, savedAt }) => {
  if (!data) return null;
  return (
    <div className="backtest-result-block">
      <div className="lab-version-row">
        <span>{badge}</span>
        <span>{data.backtestVersion || title}</span>
        <span>{data.candleCount?.toLocaleString()} / 10,000 candles</span>
        <span>{data.trades} completed trades</span>
        {savedAt && <span>Saved {new Date(savedAt).toLocaleString()}</span>}
      </div>
      <div className="lab-metrics-grid">
        <Metric label="Win Rate" value={`${data.winRate ?? 0}%`} accent />
        <Metric label="Expectancy" value={`${data.expectancyR ?? 0} R`} />
        <Metric label="Profit Factor" value={data.profitFactor ?? 0} />
        <Metric label="Total R" value={`${data.totalR ?? 0} R`} />
        <Metric label="TP2 Wins" value={data.tp2Wins ?? 0} />
        <Metric label="Losses" value={data.losses ?? 0} />
      </div>
      <div className="direction-grid">
        {["BUY", "SELL"].map((direction) => {
          const row = data.byDirection?.[direction] || {};
          return (
            <div key={direction} className={`direction-card ${direction.toLowerCase()}`}>
              <div className="direction-title"><span>{direction}</span><strong>{row.winRate ?? 0}%</strong></div>
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
    </div>
  );
};

const BacktestLab = () => {
  const cached = Object.fromEntries(Object.entries(CACHE_KEYS).map(([k, v]) => [k, readCachedBacktest(v)]));
  const [data, setData] = useState({
    v1: cached.v1?.data || null,
    v2: cached.v2?.data || null,
    accuracy: cached.accuracy?.data || null,
    v3: cached.v3?.data || null,
  });
  const [savedAt, setSavedAt] = useState({
    v1: cached.v1?.savedAt || null,
    v2: cached.v2?.savedAt || null,
    accuracy: cached.accuracy?.savedAt || null,
    v3: cached.v3?.savedAt || null,
  });
  const [loadingVersion, setLoadingVersion] = useState(null);
  const [error, setError] = useState("");

  const runBacktest = async (version) => {
    try {
      setLoadingVersion(version);
      setError("");
      const endpoint = version === "v1" ? "/backtest/v1" : version === "accuracy" ? "/backtest?engine=accuracy" : version === "v3" ? "/backtest/v3" : "/backtest";
      const response = await api.get(endpoint);
      const stamp = new Date().toISOString();
      localStorage.setItem(CACHE_KEYS[version], JSON.stringify({ data: response.data, savedAt: stamp }));
      setData((prev) => ({ ...prev, [version]: response.data }));
      setSavedAt((prev) => ({ ...prev, [version]: stamp }));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || `${version.toUpperCase()} backtest failed`);
    } finally {
      setLoadingVersion(null);
    }
  };

  const v3Comparison = useMemo(() => {
    if (!data.v2 || !data.v3) return null;
    const delta = (candidate, baseline, digits = 3) => Number((Number(candidate || 0) - Number(baseline || 0)).toFixed(digits));
    return {
      winRate: delta(data.v3.winRate, data.v2.winRate, 2),
      expectancyR: delta(data.v3.expectancyR, data.v2.expectancyR),
      profitFactor: delta(data.v3.profitFactor, data.v2.profitFactor),
      totalR: delta(data.v3.totalR, data.v2.totalR),
      trades: delta(data.v3.trades, data.v2.trades, 0),
    };
  }, [data.v2, data.v3]);

  const buttons = [
    ["v1", "V1"],
    ["v2", "V2"],
    ["accuracy", "Accuracy V2"],
    ["v3", "Enhanced V3"],
  ];

  return (
    <section className="strategy-lab glass-panel">
      <div className="strategy-lab-head">
        <div>
          <div className="eyebrow">RESEARCH MODE · LATEST 10K CANDLES</div>
          <h2>Strategy Lab</h2>
          <p>V3 upgrades BOS/CHOCH, structure, liquidity quality, directional volume, standard EMA, Wilder ATR/RSI and 1H context while leaving the live engine unchanged.</p>
        </div>
        <div className="backtest-action-row">
          {buttons.map(([version, label]) => (
            <button key={version} className="run-backtest-btn" onClick={() => runBacktest(version)} disabled={Boolean(loadingVersion)}>
              <span className="run-dot" />
              {loadingVersion === version ? `Running ${label}...` : data[version] ? `Re-run ${label}` : `Run ${label}`}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="lab-error">{error}</div>}

      <ResultPanel title="V1" badge="V1 LEGACY" data={data.v1} savedAt={savedAt.v1} />
      <ResultPanel title="V2" badge="V2 CURRENT BASELINE" data={data.v2} savedAt={savedAt.v2} />
      <ResultPanel title="Accuracy V2" badge="V2 ACCURACY CANDIDATE" data={data.accuracy} savedAt={savedAt.accuracy} />
      <ResultPanel title="Enhanced V3" badge="V3 ENHANCED RESEARCH" data={data.v3} savedAt={savedAt.v3} />

      {v3Comparison && (
        <div className="backtest-comparison-block">
          <div className="lab-version-row"><span>ENHANCED V3 − CURRENT V2</span><span>Latest 10k candle window</span></div>
          <div className="lab-metrics-grid">
            <Metric label="Win Rate Δ" value={`${v3Comparison.winRate >= 0 ? "+" : ""}${v3Comparison.winRate}%`} accent />
            <Metric label="Expectancy Δ" value={`${v3Comparison.expectancyR >= 0 ? "+" : ""}${v3Comparison.expectancyR} R`} />
            <Metric label="Profit Factor Δ" value={`${v3Comparison.profitFactor >= 0 ? "+" : ""}${v3Comparison.profitFactor}`} />
            <Metric label="Total R Δ" value={`${v3Comparison.totalR >= 0 ? "+" : ""}${v3Comparison.totalR} R`} />
            <Metric label="Completed Trades Δ" value={`${v3Comparison.trades >= 0 ? "+" : ""}${v3Comparison.trades}`} />
          </div>
          <div className="lab-footnote">
            <span>V3 is research-only. The current live engine has not been replaced.</span>
            <span>We promote V3 only if win rate, expectancy, PF and sample quality improve together.</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default BacktestLab;
