import { useMemo, useState } from "react";
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

const formatPF = (value) => value == null ? "∞" : value;

const ResultPanel = ({ data, savedAt }) => {
  if (!data) return null;

  return (
    <div className="backtest-result-block">
      <div className="lab-version-row">
        <span>V2 CURRENT</span>
        <span>{data.backtestVersion || "v2-execution-10k"}</span>
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

const AnalyzerTable = ({ title, rows = [], labelKey = "value" }) => {
  if (!rows.length) return null;

  return (
    <div className="backtest-result-block">
      <div className="lab-version-row">
        <span>{title}</span>
        <span>V2 outcome analysis</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10 }}>Condition</th>
              <th style={{ textAlign: "right", padding: 10 }}>Trades</th>
              <th style={{ textAlign: "right", padding: 10 }}>Win Rate</th>
              <th style={{ textAlign: "right", padding: 10 }}>Expectancy</th>
              <th style={{ textAlign: "right", padding: 10 }}>PF</th>
              <th style={{ textAlign: "right", padding: 10 }}>Total R</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[labelKey]}-${index}`}>
                <td style={{ padding: 10 }}>{String(row[labelKey] ?? row.range ?? "—")}</td>
                <td style={{ textAlign: "right", padding: 10 }}>{row.trades ?? 0}</td>
                <td style={{ textAlign: "right", padding: 10 }}><strong>{row.winRate ?? 0}%</strong></td>
                <td style={{ textAlign: "right", padding: 10 }}>{row.expectancyR ?? 0} R</td>
                <td style={{ textAlign: "right", padding: 10 }}>{formatPF(row.profitFactor)}</td>
                <td style={{ textAlign: "right", padding: 10 }}>{row.totalR ?? 0} R</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BacktestAnalyzer = ({ diagnostics, baselineWinRate }) => {
  const insights = useMemo(() => {
    if (!diagnostics?.breakdowns) return { best: [], worst: [] };

    const flattened = Object.entries(diagnostics.breakdowns).flatMap(([group, rows]) =>
      (rows || []).map((row) => ({
        ...row,
        group,
        label: row.value ?? row.range ?? "unknown",
      }))
    );

    const usable = flattened.filter((row) => Number(row.trades || 0) >= 10);
    const best = [...usable]
      .filter((row) => Number(row.expectancyR || 0) > 0)
      .sort((a, b) => (b.expectancyR - a.expectancyR) || (b.winRate - a.winRate))
      .slice(0, 8);
    const worst = [...usable]
      .sort((a, b) => (a.expectancyR - b.expectancyR) || (a.winRate - b.winRate))
      .slice(0, 8);

    return { best, worst };
  }, [diagnostics]);

  if (!diagnostics?.sampleSize) return null;

  const winner = diagnostics.winnerAverages || {};
  const loser = diagnostics.loserAverages || {};
  const breakdowns = diagnostics.breakdowns || {};

  return (
    <div className="backtest-comparison-block">
      <div className="lab-version-row">
        <span>WINNER VS LOSER ANALYZER</span>
        <span>{diagnostics.sampleSize} completed V2 trades studied</span>
        <span>Research only · does not change signals</span>
      </div>

      <div className="lab-metrics-grid">
        <Metric label="Baseline Win Rate" value={`${baselineWinRate ?? 0}%`} accent />
        <Metric label="Winner RSI Avg" value={winner.rsi ?? "—"} />
        <Metric label="Loser RSI Avg" value={loser.rsi ?? "—"} />
        <Metric label="Winner Volume Avg" value={winner.volumeRatio ?? "—"} />
        <Metric label="Loser Volume Avg" value={loser.volumeRatio ?? "—"} />
        <Metric label="Sample Size" value={diagnostics.sampleSize} />
      </div>

      <div className="direction-grid">
        <div className="direction-card buy">
          <div className="direction-title"><span>BEST CONDITIONS</span><strong>10+ trades</strong></div>
          <div className="direction-meta">
            {insights.best.length ? insights.best.map((row, index) => (
              <span key={`${row.group}-${row.label}-${index}`}>
                {row.group}: {String(row.label)} · {row.winRate}% WR · {row.expectancyR}R · {row.trades} trades
              </span>
            )) : <span>No strong positive bucket with enough samples yet.</span>}
          </div>
        </div>

        <div className="direction-card sell">
          <div className="direction-title"><span>WORST CONDITIONS</span><strong>10+ trades</strong></div>
          <div className="direction-meta">
            {insights.worst.length ? insights.worst.map((row, index) => (
              <span key={`${row.group}-${row.label}-${index}`}>
                {row.group}: {String(row.label)} · {row.winRate}% WR · {row.expectancyR}R · {row.trades} trades
              </span>
            )) : <span>No negative bucket with enough samples yet.</span>}
          </div>
        </div>
      </div>

      <AnalyzerTable title="BOS" rows={breakdowns.bosV3 || []} />
      <AnalyzerTable title="CHOCH" rows={breakdowns.chochV3 || []} />
      <AnalyzerTable title="TREND / MARKET STRUCTURE" rows={breakdowns.structureTrendV3 || []} />
      <AnalyzerTable title="LIQUIDITY" rows={breakdowns.liquidityTypeV3 || []} />
      <AnalyzerTable title="VOLUME BIAS" rows={breakdowns.volumeBiasV3 || []} />
      <AnalyzerTable title="RSI RANGES" rows={breakdowns.rsi || []} labelKey="range" />
      <AnalyzerTable title="VOLUME RATIO RANGES" rows={breakdowns.volumeRatio || []} labelKey="range" />
      <AnalyzerTable title="EMA50 DISTANCE / ATR" rows={breakdowns.ema50DistanceAtr || []} labelKey="range" />
      <AnalyzerTable title="EMA200 DISTANCE / ATR" rows={breakdowns.ema200DistanceAtr || []} labelKey="range" />
      <AnalyzerTable title="VOLATILITY / ATR%" rows={breakdowns.atrPct || []} labelKey="range" />
      <AnalyzerTable title="SESSION" rows={breakdowns.sessionV3 || []} />
      <AnalyzerTable title="UTC HOUR" rows={breakdowns.utcHour || []} />

      <div className="lab-footnote">
        <span>Do not trust tiny buckets. Conditions with fewer than 10 trades are excluded from Best/Worst ranking.</span>
        <span>A future V2 improvement should raise win rate without reducing expectancy, PF, or sample quality.</span>
      </div>
    </div>
  );
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
      const payload = { data: response.data, savedAt: stamp };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      setData(response.data);
      setSavedAt(stamp);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "V2 backtest failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="strategy-lab glass-panel">
      <div className="strategy-lab-head">
        <div>
          <div className="eyebrow">V2 RESEARCH · LATEST 10K CANDLES</div>
          <h2>V2 Strategy Lab</h2>
          <p>V2 is the only active strategy. Run the backtest to refresh performance and automatically study which market conditions helped winners and hurt losers.</p>
        </div>
        <div className="backtest-action-row">
          <button className="run-backtest-btn" onClick={runBacktest} disabled={loading}>
            <span className="run-dot" />
            {loading ? "Running V2..." : data ? "Re-run V2 + Analyzer" : "Run V2 + Analyzer"}
          </button>
        </div>
      </div>

      {error && <div className="lab-error">{error}</div>}

      {!data && !error && (
        <div className="lab-idle">
          <div className="orbital-loader"><span /></div>
          <div>
            <strong>V2 analyzer ready</strong>
            <p>Run V2 once. The Winner vs Loser Analyzer will appear below the backtest result automatically.</p>
          </div>
        </div>
      )}

      <ResultPanel data={data} savedAt={savedAt} />
      <BacktestAnalyzer diagnostics={data?.diagnostics} baselineWinRate={data?.winRate} />
    </section>
  );
};

export default BacktestLab;
