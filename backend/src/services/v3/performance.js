import V3Decision from "../../models/V3Decision.js";
import Trade from "../../models/Trade.js";

const r=(v,d=2)=>Number.isFinite(v)?Number(v.toFixed(d)):0;
export async function getV3Performance(){
 const rows=await V3Decision.find({strategyVersion:"v3-tradingagents-btc-shadow"}).lean();
 const directional=rows.filter(x=>["BUY","SELL"].includes(x.finalDecision));
 const settled=directional.filter(x=>x.shadowOutcome);
 const wins=settled.filter(x=>x.shadowOutcome.won);
 const avg=settled.length?settled.reduce((s,x)=>s+(Number(x.shadowOutcome.returnPct)||0),0)/settled.length:0;
 const byDirection={};
 for(const dir of ["BUY","SELL"]){const a=settled.filter(x=>x.finalDecision===dir),w=a.filter(x=>x.shadowOutcome.won);byDirection[dir]={settled:a.length,wins:w.length,losses:a.length-w.length,winRate:a.length?r(w.length/a.length*100):0,avgReturnPct:a.length?r(a.reduce((s,x)=>s+x.shadowOutcome.returnPct,0)/a.length,3):0}}
 const v2=await Trade.find({strategyVersion:"v2-live-tp1-lock",status:"CLOSED"}).lean();
 const v2wins=v2.filter(x=>["TP1_LOCK_HIT","TP2_HIT"].includes(x.result));
 return {
  v3:{totalDecisions:rows.length,directional:directional.length,skips:rows.length-directional.length,pending:directional.length-settled.length,settled:settled.length,wins:wins.length,losses:settled.length-wins.length,winRate:settled.length?r(wins.length/settled.length*100):0,avgForwardReturnPct:r(avg,3),byDirection},
  v2Live:{closed:v2.length,wins:v2wins.length,losses:v2.length-v2wins.length,winRate:v2.length?r(v2wins.length/v2.length*100):0},
  note:"V3 uses fixed-horizon shadow direction outcomes; V2 uses its TP1-lock trade-management outcomes. Compare cautiously because outcome definitions differ."
 };
}
