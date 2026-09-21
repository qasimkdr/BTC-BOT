import {useEffect,useState} from "react";
import api from "../services/api";
const n=v=>Number(v||0).toFixed(2);
export default function V3PerformanceCard(){
 const [d,setD]=useState(null);
 useEffect(()=>{let on=true;const load=()=>api.get("/v3/performance").then(r=>on&&setD(r.data)).catch(()=>{});load();const id=setInterval(load,15000);return()=>{on=false;clearInterval(id)}},[]);
 if(!d)return null; const a=d.v3,b=d.v2Live;
 return <section className="strategy-lab glass-panel"><div className="strategy-lab-head"><div><div className="eyebrow">FORWARD EVIDENCE</div><h2>V2 vs V3</h2><p>Fresh shadow evidence only. V3 remains observation-only.</p></div></div>
 <div className="direction-grid"><div className="direction-card buy"><div className="direction-title"><span>V3 AI SHADOW</span><strong>{n(a.winRate)}%</strong></div><div className="direction-meta"><span>{a.wins}W / {a.losses}L</span><span>{a.settled} settled</span><span>{a.pending} pending</span><span>{a.skips} skips</span><span>Avg {n(a.avgForwardReturnPct)}%</span></div></div>
 <div className="direction-card sell"><div className="direction-title"><span>V2 LIVE</span><strong>{n(b.winRate)}%</strong></div><div className="direction-meta"><span>{b.wins}W / {b.losses}L</span><span>{b.closed} closed</span></div></div></div>
 <div className="lab-footnote"><span>{d.note}</span></div></section>
}