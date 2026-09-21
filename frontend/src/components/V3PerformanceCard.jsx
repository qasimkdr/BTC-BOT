import {useEffect,useState} from "react";
import api from "../services/api";
const n=v=>Number(v||0).toFixed(2);
export default function V3PerformanceCard(){
 const [d,setD]=useState(null); const [err,setErr]=useState("");
 useEffect(()=>{let on=true;const load=()=>api.get("/v3/performance").then(r=>{if(on){setD(r.data);setErr("")}}).catch(e=>on&&setErr(e?.message||"Performance unavailable"));load();const id=setInterval(load,15000);return()=>{on=false;clearInterval(id)}},[]);
 if(!d)return <section className="strategy-lab glass-panel"><div className="lab-idle"><div><strong>V2 vs V3 evidence</strong><p>{err||"Loading performance…"}</p></div></div></section>; const a=d.v3,b=d.v2Live;
 return <section className="strategy-lab glass-panel"><div className="strategy-lab-head"><div><div className="eyebrow">FORWARD EVIDENCE</div><h2>V2 vs V3</h2><p>Fresh shadow evidence only. V3 remains observation-only.</p></div></div>
 <div className="direction-grid"><div className="direction-card buy"><div className="direction-title"><span>V3 AI SHADOW</span><strong>{n(a.winRate)}%</strong></div><div className="direction-meta"><span>{a.wins}W / {a.losses}L</span><span>{a.settled} settled</span><span>{a.pending} pending</span><span>{a.skips} skips</span><span>{n(a.totalR)}R total</span><span>{n(a.expectancyR)}R expectancy</span><span>PF {a.profitFactor}</span><span>Unfilled {a.statuses?.UNFILLED||0}</span><span>Ambiguous {a.statuses?.AMBIGUOUS||0}</span><span>Unresolved {a.statuses?.UNRESOLVED||0}</span></div></div>
 <div className="direction-card sell"><div className="direction-title"><span>V2 LIVE</span><strong>{n(b.winRate)}%</strong></div><div className="direction-meta"><span>{b.wins}W / {b.losses}L</span><span>{b.closed} closed</span><span>{n(b.totalR)}R total</span><span>{n(b.expectancyR)}R expectancy</span><span>PF {b.profitFactor}</span></div></div></div>
 {d.sampleWarning&&<div className="lab-error">{d.sampleWarning}</div>}<div className="lab-footnote"><span>{d.note}</span></div></section>
}