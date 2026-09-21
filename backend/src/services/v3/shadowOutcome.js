import V3Decision from "../../models/V3Decision.js";
import Candle15m from "../../models/Candle15m.js";

const HORIZON=Number(process.env.V3_OUTCOME_CANDLES)||8;
export async function settleV3ShadowOutcomes(){
 const pending=await V3Decision.find({strategyVersion:"v3-tradingagents-btc-shadow",shadowOutcome:null,finalDecision:{$in:["BUY","SELL"]}}).sort({candleTime:1}).limit(50);
 let settled=0;
 for(const d of pending){
  const future=await Candle15m.find({openTime:{$gt:d.candleTime}}).sort({openTime:1}).limit(HORIZON).lean();
  if(future.length<HORIZON) continue;
  const entry=Number(d.marketSnapshot?.m15?.close);
  if(!entry) continue;
  const exit=Number(future.at(-1).close);
  const direction=d.finalDecision==="BUY"?1:-1;
  const returnPct=((exit-entry)/entry)*100*direction;
  let mfe=0,mae=0;
  for(const c of future){
   const favorable=d.finalDecision==="BUY"?(c.high-entry)/entry:(entry-c.low)/entry;
   const adverse=d.finalDecision==="BUY"?(entry-c.low)/entry:(c.high-entry)/entry;
   mfe=Math.max(mfe,favorable*100); mae=Math.max(mae,adverse*100);
  }
  d.shadowOutcome={horizonCandles:HORIZON,entry,exit,returnPct,mfePct:mfe,maePct:mae,won:returnPct>0,settledAt:Date.now()};
  await d.save(); settled++;
 }
 return settled;
}
