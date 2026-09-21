import {useEffect,useState} from "react";
import api from "../services/api";

const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(0)}%`:"—";
export default function V3TradingAgentsCard(){
 const [data,setData]=useState(null); const [err,setErr]=useState("");
 useEffect(()=>{let alive=true; const load=()=>api.get("/v3/status").then(r=>{if(alive){setData(r.data);setErr("")}}).catch(e=>alive&&setErr(e?.message||"V3 unavailable")); load(); const id=setInterval(load,15000); return()=>{alive=false;clearInterval(id)}},[]);
 const x=data?.latest;
 return <section className="strategy-lab glass-panel">
  <div className="strategy-lab-head"><div><div className="eyebrow">V3 TRADINGAGENTS</div><h2>AI Shadow Committee</h2><p>Full analyst → debate → trader → risk → reflection workflow. Observation only; V2 execution remains untouched.</p></div><span className="run-backtest-btn" style={{cursor:"default"}}>{data?.llmConfigured?"AI CONNECTED":"AI KEY REQUIRED"}</span></div>
  {err&&<div className="lab-error">{err}</div>}
  {!x?<div className="lab-idle"><div className="orbital-loader"><span/></div><div><strong>No V3 decision yet</strong><p>Enable the shadow scanner and configure the V3 LLM provider on the backend.</p></div></div>:
  <><div className="lab-version-row"><span>{x.mode}</span><span>{x.strategyVersion}</span><span>Regime {x.marketSnapshot?.regime||"—"}</span></div>
  <div className="lab-metrics-grid">
   <div className="lab-metric lab-metric-accent"><span>Final Decision</span><strong>{x.finalDecision}</strong></div>
   <div className="lab-metric"><span>Confidence</span><strong>{pct(x.confidence)}</strong></div>
   <div className="lab-metric"><span>15m</span><strong>{x.marketSnapshot?.m15?.trend||"—"}</strong></div>
   <div className="lab-metric"><span>1h</span><strong>{x.marketSnapshot?.h1?.trend||"—"}</strong></div>
   <div className="lab-metric"><span>4h</span><strong>{x.marketSnapshot?.h4?.trend||"—"}</strong></div>
   <div className="lab-metric"><span>RSI 15m</span><strong>{Number(x.marketSnapshot?.m15?.rsi||0).toFixed(1)}</strong></div>
  </div>
  <div className="lab-idle"><div><strong>Final risk verdict</strong><p>{x.rationale||"No rationale yet."}</p></div></div>
  <div className="lab-footnote"><span>Bull/Bear rounds: {data?.config?.maxDebateRounds||1}</span><span>Risk rounds: {data?.config?.maxRiskRounds||1}</span><span>Quick: {data?.config?.quickModel||"—"}</span><span>Deep: {data?.config?.deepModel||"—"}</span><span>Shadow only</span></div></>}
 </section>
}
