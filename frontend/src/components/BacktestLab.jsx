import { useMemo, useState } from "react";
import api from "../services/api";

const CACHE_KEYS = {
  v1: "btc-bot-v1-backtest-10k",
  v2: "btc-bot-v2-backtest-10k",
  accuracy: "btc-bot-v2-accuracy-backtest-10k",
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
              <div className="direction-title">
                <span>{direction}</span>
                <strong>{row.winRate ?? 0}%</strong>
              </div>
              <div className="direction-bar">
                <span style={{ width: `${Math.min(row.winRate || 0, 100)}%` }} />
              </div>
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
  const cachedV1 = readCachedBacktest(CACHE_KEYS.v1);
  const cachedV2 = readCachedBacktest(CACHE_KEYS.v2);
  const cachedAccuracy = readCachedBacktest(CACHE_KEYS.accuracy);

  const [v1Data, setV1Data] = useState(cachedV1?.data || null);
  const [v2Data, setV2Data] = useState(cachedV2?.data || null);
  const [accuracyData, setAccuracyData] = useState(cachedAccuracy?.data || null);
  const [v1SavedAt, setV1SavedAt] = useState(cachedV1?.savedAt || null);
  const [v2SavedAt, setV2SavedAt] = useState(cachedV2?.savedAt || null);
  const [accuracySavedAt, setAccuracySavedAt] = useState(cachedAccuracy?.savedAt || null);
  const [loadingVersion, setLoadingVersion] = useState(null);
  const [error, setError] = useState("");

  const runBacktest = async (version) => {
    try {
      setLoadingVersion(version);
      setError("");

      const endpoint =
        version === "v1"
          ? "/backtest/v1"
          : version === "accuracy"
            ? "/backtest?engine=accuracy"
            : "/backtest";

      const response = await api.get(endpoint);
      const stamp = new Date().toISOString();
      const payload = { data: response.data, savedAt: stamp };

      localStorage.setItem(CACHE_KEYS[version], JSON.stringify(payload));

      if (version === "v1") {
        setV1Data(response.data);
        setV1SavedAt(stamp);
      } else if (version === "accuracy") {
        setAccuracyData(response.data);
        setAccuracySavedAt(stamp);
      } else {
        setV2Data(response.data);
        setV2SavedAt(stamp);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || `${version.toUpperCase()} backtest failed`);
    } finally {
      setLoadingVersion(null);
    }
  };

  const comparison = useMemo(() => {
    if (!v2Data || !accuracyData) return null;

    const delta = (candidate, baseline, digits = 3) => {
      const value = Number(candidate || 0) - Number(baseline || 0);
      return Number(value.toFixed(digits));
    };

    return {
      winRate: delta(accuracyData.winRate, v2Data.winRate, 2),
      expectancyR: delta(accuracyData.expectancyR, v2Data.expectancyR),
      profitFactor: delta(accuracyData.profitFactor, v2Data.profitFactor),
      totalR: delta(accuracyData.totalR, v2Data.totalR),
      trades: delta(accuracyData.trades, v2Data.trades, 0),
    };
  }, [v2Data, accuracyData]);

  return (
    <section className="strategy-lab glass-panel">
      <div className="strategy-lab-head">
        <div>
          <div className="eyebrow">RESEARCH MODE · SAME LATEST 10K CANDLES</div>
          <h2>Strategy Lab</h2>
          <p>
            Compare V1 legacy, V2 corrected execution, and the new accuracy-focused V2 candidate on the exact same latest 10,000 stored 15m candles. Results stay saved on this device.
          </p>
        </div>

        <div className="backtest-action-row">
          <button className="run-backtest-btn" onClick={() => runBacktest("v1")} disabled={Boolean(loadingVersion)}>
            <span className="run-dot" />
            {loadingVersion === "v1" ? "Running V1..." : v1Data ? "Re-run V1" : "Run V1"}
          </button>

          <button className="run-backtest-btn" onClick={() => runBacktest("v2")} disabled={Boolean(loadingVersion)}>
            <span className="run-dot" />
            {loadingVersion === "v2" ? "Running V2..." : v2Data ? "Re-run V2" : "Run V2"}
          </button>

          <button className="run-backtest-btn" onClick={() => runBacktest("accuracy")} disabled={Boolean(loadingVersion)}>
            <span className="run-dot" />
            {loadingVersion === "accuracy"
              ? "Testing accuracy..."
              : accuracyData
                ? "Re-run Accuracy V2"
                : "Run Accuracy V2"}
          </button>
        </div>
      </div>

      {error && <div className="lab-error">{error}</div>}

      {!v1Data && !v2Data && !accuracyData && !error && (
        <div className="lab-idle">
          <div className="orbital-loader"><span /></div>
          <div>
            <strong>Accuracy research ready</strong>
            <p>Use Accuracy V2 to test the stricter candidate. A higher win rate only matters if expectancy and trade count remain useful.</p>
          </div>
        </div>
      )}

      <ResultPanel title="V1" badge="V1 LEGACY" data={v1Data} savedAt={v1SavedAt} />
      <ResultPanel title="V2" badge="V2 CORRECTED" data={v2Data} savedAt={v2SavedAt} />
      <ResultPanel title="Accuracy V2" badge="V2 ACCURACY CANDIDATE" data={accuracyData} savedAt={accuracySavedAt} />

      {comparison && (
        <div className="backtest-comparison-block">
          <div className="lab-version-row">
            <span>ACCURACY V2 − CURRENT V2</span>
            <span>Same latest 10k candle window</span>
          </div>
          <div className="lab-metrics-grid">
            <Metric label="Win Rate Δ" value={`${comparison.winRate >= 0 ? "+" : ""}${comparison.winRate}%`} accent />
            <Metric label="Expectancy Δ" value={`${comparison.expectancyR >= 0 ? "+" : ""}${comparison.expectancyR} R`} />
            <Metric label="Profit Factor Δ" value={`${comparison.profitFactor >= 0 ? "+" : ""}${comparison.profitFactor}`} />
            <Metric label="Total R Δ" value={`${comparison.totalR >= 0 ? "+" : ""}${comparison.totalR} R`} />
            <Metric label="Completed Trades Δ" value={`${comparison.trades >= 0 ? "+" : ""}${comparison.trades}`} />
          </div>
          <div className="lab-footnote">
            <span>Accuracy V2 is research-only and does not change live trading.</span>
            <span>We will not promote it just because win rate rises; expectancy, PF and sample size must also stay healthy.</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default BacktestLab;
