import V3Decision from "../../models/V3Decision.js";
import Candle15m from "../../models/Candle15m.js";
import { invokeV3LLM } from "./llmClient.js";
import { V3_PROMPTS } from "./prompts.js";

const MAX_BARS=Math.max(Number(process.env.V3_EXECUTION_MAX_BARS)||96,8);

const touched=(c,p)=>Number(c.low)<=p&&Number(c.high)>=p;
function simulate(plan,candles){
 let entered=false,tp1=false,barsHeld=0,mfeR=0,maeR=0;
 const buy=plan.direction==="BUY",risk=plan.riskPoints;
 for(let i=0;i<candles.length;i++){
  const c=candles[i];
  if(!entered){if(!touched(c,plan.entry))continue;entered=true}
  barsHeld++;
  const favorable=buy?Number(c.high)-plan.entry:plan.entry-Number(c.low);
  const adverse=buy?plan.entry-Number(c.low):Number(c.high)-plan.entry;
  mfeR=Math.max(mfeR,favorable/risk); maeR=Math.max(maeR,adverse/risk);

  if(!tp1){
   const sl=buy?Number(c.low)<=plan.stopLoss:Number(c.high)>=plan.stopLoss;
   const t1=buy?Number(c.high)>=plan.takeProfit1:Number(c.low)<=plan.takeProfit1;
   if(sl&&t1)return {status:"AMBIGUOUS",r:null,barsHeld,mfeR,maeR};
   if(sl)return {status:"SL_HIT",r:-1,barsHeld,mfeR,maeR};
   if(t1)tp1=true;
  }
  if(tp1){
   const t2=buy?Number(c.high)>=plan.takeProfit2:Number(c.low)<=plan.takeProfit2;
   const lock=buy?Number(c.low)<=plan.takeProfit1:Number(c.high)>=plan.takeProfit1;
   if(t2&&lock)return {status:"AMBIGUOUS",r:null,barsHeld,mfeR,maeR};
   if(t2)return {status:"TP2_HIT",r:2,barsHeld,mfeR,maeR};
   if(lock)return {status:"TP1_LOCK_HIT",r:1,barsHeld,mfeR,maeR};
  }
 }
 return entered?{status:"UNRESOLVED",r:null,barsHeld,mfeR,maeR}:{status:"UNFILLED",r:null,barsHeld:0,mfeR:0,maeR:0};
}

export async function settleV3ShadowOutcomes(){
 const pending=await V3Decision.find({strategyVersion:"v3-tradingagents-btc-shadow",shadowOutcome:null,finalDecision:{$in:["BUY","SELL"]},shadowPlan:{$ne:null}}).sort({candleTime:1}).limit(50);
 let settled=0;
 for(const d of pending){
  const future=await Candle15m.find({openTime:{$gt:d.candleTime}}).sort({openTime:1}).limit(MAX_BARS).lean();
  if(future.length<MAX_BARS)continue;
  const result=simulate(d.shadowPlan,future);
  d.shadowOutcome={...result,managementPlan:"TP1_LOCK_TO_TP1",maxBars:MAX_BARS,won:Number(result.r)>0,settledAt:Date.now()};
  await d.save();settled++;
 }
 return settled;
}
