import { useState } from "react";
import api from "../services/api";

const PF = ({ value }) => <>{value == null ? "∞" : value}</>;
const Metric = ({ label, value }) => <div className="lab-metric"><span>{label}</span><strong>{value}</strong></div>;

const WalkForwardResearch = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    try {
      setLoading(true); setError("");
      const response = await api.get("/backtest/walk-forward");
      setData(response.data);
    } catch (err) {
      const p = err?.response?.data;
      setError((p?.message || err.message || "Walk-forward test failed") + (p?.availableCandles ? ` Available: ${p.availableCandles}.` : ""));
    } finally { setLoading(false); }
  };

  const unseen = data?.unseenValidation;
  return (
    <section className="strategy-lab glass-panel">
      <div className="strategy-lab-head">
        <div>
          <div className="eyebrow">V2 WALK-FORWARD · RISK STRESS</div>
          <h2>Robustness Lab</h2>
          <p>Stops hunting for a lucky 70% filter. Window 1 is treated as discovery; windows 2–3 are unseen validation. Also measures drawdown and applies a configurable 0.05R-per-trade cost stress.</p>
        </div>
        <button className="run-backtest-btn" onClick={run} disabled={loading}><span className="run-dot" />{loading ? "Stress testing..." : data ? "Re-run Robustness Test" : "Run Walk-Forward Test"}</button>
      </div>
      {error && <div className="lab-error">{error}</div>}
      {data && <>
        <div className="backtest-result-block">
          <div className="lab-version-row"><span>{data.verdict}</span><span>Live V2 unchanged</span><span>30,000 candles</span></div>
          <div className="lab-metrics-grid">
            <Metric label="Unseen Gross WR" value={`${unseen?.gross?.winRate ?? 0}%`} />
            <Metric label="Unseen Gross Exp" value={`${unseen?.gross?.expectancyR ?? 0} R`} />
            <Metric label="Cost-Stress Exp" value={`${unseen?.costStress?.expectancyR ?? 0} R`} />
            <Metric label="Cost-Stress PF" value={<PF value={unseen?.costStress?.profitFactor} />} />
            <Metric label="Cost-Stress Total" value={`${unseen?.costStress?.totalR ?? 0} R`} />
            <Metric label="Max Drawdown" value={`${unseen?.costStress?.maxDrawdownR ?? 0} R`} />
            <Metric label="Max Losing Streak" value={unseen?.costStress?.maxLosingStreak ?? 0} />
          </div>
        </div>
        <div className="backtest-result-block">
          <div className="lab-version-row"><span>WINDOW / REGIME BREAKDOWN</span><span>Gross vs cost-stressed V2</span></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:950}}>
            <thead><tr><th style={{textAlign:"left",padding:10}}>Window</th><th>Regime</th><th>Price Δ</th><th>Trades</th><th>WR</th><th>Gross Exp</th><th>Cost Exp</th><th>Cost PF</th><th>Cost R</th><th>Drawdown</th></tr></thead>
            <tbody>{(data.windows||[]).map(w=><tr key={w.window}>
              <td style={{padding:10}}>{w.label}</td><td style={{textAlign:"center"}}>{w.regime?.trend}</td><td style={{textAlign:"center"}}>{w.regime?.priceChangePct}%</td><td style={{textAlign:"center"}}>{w.gross?.trades}</td><td style={{textAlign:"center"}}><strong>{w.gross?.winRate}%</strong></td><td style={{textAlign:"center"}}>{w.gross?.expectancyR}R</td><td style={{textAlign:"center"}}>{w.costStress?.expectancyR}R</td><td style={{textAlign:"center"}}><PF value={w.costStress?.profitFactor}/></td><td style={{textAlign:"center"}}>{w.costStress?.totalR}R</td><td style={{textAlign:"center"}}>{w.costStress?.maxDrawdownR}R</td>
            </tr>)}</tbody>
          </table></div>
        </div>
        <div className="lab-footnote"><span>{data.methodology?.costNote}</span><span>{data.note}</span></div>
      </>}
    </section>
  );
};
export default WalkForwardResearch;
