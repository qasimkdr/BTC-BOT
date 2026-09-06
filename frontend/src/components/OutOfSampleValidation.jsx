import { useState } from "react";
import api from "../services/api";

const PF = ({ value }) => <>{value == null ? "∞" : value}</>;

const MiniMetric = ({ label, value }) => (
  <div className="lab-metric">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const DirectionSummary = ({ title, row }) => (
  <div className="direction-card">
    <div className="direction-title"><span>{title}</span><strong>{row?.winRate ?? 0}%</strong></div>
    <div className="direction-meta">
      <span>{row?.trades ?? 0} trades</span>
      <span>{row?.expectancyR ?? 0} R expectancy</span>
      <span>PF <PF value={row?.profitFactor} /></span>
      <span>{row?.totalR ?? 0} R total</span>
    </div>
  </div>
);

const OutOfSampleValidation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runValidation = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/backtest/validate?windows=3");
      setData(response.data);
    } catch (err) {
      const payload = err?.response?.data;
      const detail = payload?.availableCandles
        ? ` Available: ${payload.availableCandles?.toLocaleString()} candles. Required: ${payload.requiredCandles?.toLocaleString()}.`
        : "";
      setError((payload?.message || err.message || "Validation failed") + detail);
    } finally {
      setLoading(false);
    }
  };

  const baseline = data?.aggregate?.baseline;
  const candidate = data?.aggregate?.candidate;
  const delta = data?.aggregate?.delta;
  const robustness = data?.robustness;

  return (
    <section className="strategy-lab glass-panel">
      <div className="strategy-lab-head">
        <div>
          <div className="eyebrow">V2 OUT-OF-SAMPLE VALIDATION</div>
          <h2>73% Candidate Stress Test</h2>
          <p>
            Tests the current V2 against the strongest filtered candidate on up to three independent,
            non-overlapping 10,000-candle windows. Live V2 is not changed.
          </p>
        </div>
        <div className="backtest-action-row">
          <button className="run-backtest-btn" onClick={runValidation} disabled={loading}>
            <span className="run-dot" />
            {loading ? "Validating..." : data ? "Re-run Validation" : "Run 3-Window Validation"}
          </button>
        </div>
      </div>

      {error && <div className="lab-error">{error}</div>}

      {data && (
        <>
          <div className="backtest-result-block">
            <div className="lab-version-row">
              <span>ROBUSTNESS VERDICT: {robustness?.verdict}</span>
              <span>{robustness?.totalWindows} windows tested</span>
              <span>{data.availableCandles?.toLocaleString()} candles loaded</span>
            </div>

            <div className="lab-metrics-grid">
              <MiniMetric label="Baseline WR" value={`${baseline?.winRate ?? 0}%`} />
              <MiniMetric label="Candidate WR" value={`${candidate?.winRate ?? 0}%`} />
              <MiniMetric label="WR Lift" value={`${delta?.winRate >= 0 ? "+" : ""}${delta?.winRate ?? 0}%`} />
              <MiniMetric label="Candidate Expectancy" value={`${candidate?.expectancyR ?? 0} R`} />
              <MiniMetric label="Candidate PF" value={<PF value={candidate?.profitFactor} />} />
              <MiniMetric label="Candidate Total R" value={`${candidate?.totalR ?? 0} R`} />
            </div>

            <div className="lab-footnote">
              <span>70%+ windows: {robustness?.windowsAtOrAbove70}/{robustness?.totalWindows}</span>
              <span>Profitable windows: {robustness?.profitableWindows}/{robustness?.totalWindows}</span>
              <span>Beats baseline: {robustness?.beatsBaselineWindows}/{robustness?.totalWindows}</span>
            </div>
          </div>

          <div className="backtest-result-block">
            <div className="lab-version-row">
              <span>WINDOW-BY-WINDOW RESULTS</span>
              <span>Independent execution for baseline and candidate</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 10 }}>Window</th>
                    <th style={{ textAlign: "right", padding: 10 }}>V2 Trades</th>
                    <th style={{ textAlign: "right", padding: 10 }}>V2 WR</th>
                    <th style={{ textAlign: "right", padding: 10 }}>Candidate Trades</th>
                    <th style={{ textAlign: "right", padding: 10 }}>Candidate WR</th>
                    <th style={{ textAlign: "right", padding: 10 }}>WR Lift</th>
                    <th style={{ textAlign: "right", padding: 10 }}>Expectancy</th>
                    <th style={{ textAlign: "right", padding: 10 }}>PF</th>
                    <th style={{ textAlign: "right", padding: 10 }}>Total R</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.windows || []).map((window) => (
                    <tr key={window.window}>
                      <td style={{ padding: 10 }}>{window.label}</td>
                      <td style={{ textAlign: "right", padding: 10 }}>{window.baseline.trades}</td>
                      <td style={{ textAlign: "right", padding: 10 }}>{window.baseline.winRate}%</td>
                      <td style={{ textAlign: "right", padding: 10 }}>{window.candidate.trades}</td>
                      <td style={{ textAlign: "right", padding: 10 }}><strong>{window.candidate.winRate}%</strong></td>
                      <td style={{ textAlign: "right", padding: 10 }}>{window.delta.winRate >= 0 ? "+" : ""}{window.delta.winRate}%</td>
                      <td style={{ textAlign: "right", padding: 10 }}>{window.candidate.expectancyR} R</td>
                      <td style={{ textAlign: "right", padding: 10 }}><PF value={window.candidate.profitFactor} /></td>
                      <td style={{ textAlign: "right", padding: 10 }}>{window.candidate.totalR} R</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="direction-grid">
            <DirectionSummary title="CANDIDATE BUY" row={candidate?.byDirection?.BUY} />
            <DirectionSummary title="CANDIDATE SELL" row={candidate?.byDirection?.SELL} />
          </div>

          <div className="backtest-result-block">
            <div className="lab-version-row"><span>CANDIDATE RULES</span><span>Research filter only</span></div>
            <div className="direction-meta">
              {(data.candidate?.rules || []).map((rule) => <span key={rule}>{rule}</span>)}
            </div>
            <div className="lab-footnote">
              <span>{data.note}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default OutOfSampleValidation;
