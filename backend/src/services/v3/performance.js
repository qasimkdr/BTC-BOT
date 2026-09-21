import V3Decision from "../../models/V3Decision.js";
import Trade from "../../models/Trade.js";
const r=(v,d=2)=>Number.isFinite(v)?Number(v.toFixed(d)):0;
export async function getV3Performance(){
 const rows=await V3Decision.find({strategyVersion:"v3-tradingagents-btc-shadow"}).lean();
 const directional=rows.filter(x=>["BUY","SELL"].includes(x.finalDecision));
 const resolved=directional.filter(x=>Number.isFinite(Number(x.shadowOutcome?.r)));
 const wins=resolved.filter(x=>Number(x.shadowOutcome.r)>0),losses=resolved.filter(x=>Number(x.shadowOutcome.r)<0);
 const statuses={}; for(const x of directional){const s=x.shadowOutcome?.status||"PENDING";statuses[s]=(statuses[s]||0)+1}
 const totalR=resolved.reduce((s,x)=>s+Number(x.shadowOutcome.r),0);
 const grossWins=wins.reduce((s,x)=>s+Number(x.shadowOutcome.r),0),grossLoss=Math.abs(losses.reduce((s,x)=>s+Number(x.shadowOutcome.r),0));
 const byDirection={};
 for(const dir of ["BUY","SELL"]){const a=resolved.filter(x=>x.finalDecision===dir),w=a.filter(x=>x.shadowOutcome.r>0);byDirection[dir]={settled:a.length,wins:w.length,losses:a.length-w.length,winRate:a.length?r(w.length/a.length*100):0,totalR:r(a.reduce((s,x)=>s+x.shadowOutcome.r,0)),expectancyR:a.length?r(a.reduce((s,x)=>s+x.shadowOutcome.r,0)/a.length,3):0}}
 const v2=await Trade.find({strategyVersion:"v2-live-tp1-lock",status:"CLOSED"}).lean();
 const v2wins=v2.filter(x=>["TP1_LOCK_HIT","TP2_HIT"].includes(x.result));
 const v2Rs=v2.map(x=>x.result==="TP2_HIT"?2:x.result==="TP1_LOCK_HIT"?1:x.result==="SL_HIT"?-1:0);\n const v2R=v2Rs.reduce((s,x)=>s+x,0),v2GrossWins=v2Rs.filter(x=>x>0).reduce((a,b)=>a+b,0),v2GrossLoss=Math.abs(v2Rs.filter(x=>x<0).reduce((a,b)=>a+b,0));
 return {comparable:true,managementPlan:"TP1_LOCK_TO_TP1",
  v3:{totalDecisions:rows.length,directional:directional.length,skips:rows.length-directional.length,pending:statuses.PENDING||0,settled:resolved.length,wins:wins.length,losses:losses.length,winRate:resolved.length?r(wins.length/resolved.length*100):0,totalR:r(totalR),expectancyR:resolved.length?r(totalR/resolved.length,3):0,profitFactor:grossLoss?r(grossWins/grossLoss,3):grossWins?"∞":0,statuses,byDirection},
  v2Live:{closed:v2.length,wins:v2wins.length,losses:v2.length-v2wins.length,winRate:v2.length?r(v2wins.length/v2.length*100):0,totalR:r(v2R),expectancyR:v2.length?r(v2R/v2.length,3):0,profitFactor:v2GrossLoss?r(v2GrossWins/v2GrossLoss,3):v2GrossWins?"∞":0},
  sampleWarning:resolved.length<30?"V3 has fewer than 30 settled directional outcomes; treat comparisons as preliminary.":null,\n  note:"Win rate/PF/expectancy include only resolved +2R/+1R/-1R V3 outcomes. Ambiguous, unfilled and unresolved cases are reported separately and excluded. V2 and V3 are not paired on identical decision timestamps."
 };
}
