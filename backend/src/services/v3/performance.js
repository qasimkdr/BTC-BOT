import V3Decision from "../../models/V3Decision.js";
import Trade from "../../models/Trade.js";
const r=(v,d=2)=>Number.isFinite(v)?Number(v.toFixed(d)):0;
export async function getV3Performance(){
 const rows=await V3Decision.find({strategyVersion:"v3-tradingagents-btc-shadow"}).lean();
 const directional=rows.filter(x=>["BUY","SELL"].includes(x.finalDecision));
 const settled=directional.filter(x=>Number.isFinite(Number(x.shadowOutcome?.r)));
 const wins=settled.filter(x=>Number(x.shadowOutcome.r)>0),losses=settled.filter(x=>Number(x.shadowOutcome.r)<0);
 const totalR=settled.reduce((s,x)=>s+Number(x.shadowOutcome.r),0);
 const grossWins=wins.reduce((s,x)=>s+Number(x.shadowOutcome.r),0),grossLoss=Math.abs(losses.reduce((s,x)=>s+Number(x.shadowOutcome.r),0));
 const byDirection={};
 for(const dir of ["BUY","SELL"]){const a=settled.filter(x=>x.finalDecision===dir),w=a.filter(x=>x.shadowOutcome.r>0);byDirection[dir]={settled:a.length,wins:w.length,losses:a.length-w.length,winRate:a.length?r(w.length/a.length*100):0,totalR:r(a.reduce((s,x)=>s+x.shadowOutcome.r,0)),expectancyR:a.length?r(a.reduce((s,x)=>s+x.shadowOutcome.r,0)/a.length,3):0}}
 const v2=await Trade.find({strategyVersion:"v2-live-tp1-lock",status:"CLOSED"}).lean();
 const v2wins=v2.filter(x=>["TP1_LOCK_HIT","TP2_HIT"].includes(x.result));
 const v2R=v2.reduce((s,x)=>s+(x.result==="TP2_HIT"?2:x.result==="TP1_LOCK_HIT"?1:x.result==="SL_HIT"?-1:0),0);
 return {
  comparable:true,managementPlan:"TP1_LOCK_TO_TP1",
  v3:{totalDecisions:rows.length,directional:directional.length,skips:rows.length-directional.length,pending:directional.length-settled.length,settled:settled.length,wins:wins.length,losses:losses.length,winRate:settled.length?r(wins.length/settled.length*100):0,totalR:r(totalR),expectancyR:settled.length?r(totalR/settled.length,3):0,profitFactor:grossLoss?r(grossWins/grossLoss,3):grossWins?"∞":0,byDirection},
  v2Live:{closed:v2.length,wins:v2wins.length,losses:v2.length-v2wins.length,winRate:v2.length?r(v2wins.length/v2.length*100):0,totalR:r(v2R),expectancyR:v2.length?r(v2R/v2.length,3):0},
  note:"Both sides now use the same +2R TP2 / +1R TP1-lock / -1R SL payoff definition. V3 is still shadow-simulated and may have different entry timing/fill opportunities."
 };
}
