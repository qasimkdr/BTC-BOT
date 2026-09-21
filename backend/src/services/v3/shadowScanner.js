import V3Decision from "../../models/V3Decision.js";
import { runTradingAgentsShadow } from "./agentRunner.js";
import { settleV3ShadowOutcomes } from "./shadowOutcome.js";

let timer=null, running=false;
const INTERVAL_MS=Math.max(Number(process.env.V3_SCAN_INTERVAL_MS)||15*60*1000,60*1000);

export async function scanV3Shadow(){
 if(running) return;
 running=true;
 try{
  await settleV3ShadowOutcomes();
  const Candle15m=(await import("../../models/Candle15m.js")).default;\n  const now=Date.now();\n  const latestCandle=await Candle15m.findOne({closeTime:{$lte:now}}).sort({openTime:-1}).select("openTime closeTime").lean();
  if(!latestCandle?.openTime) throw new Error("No closed 15m candle available for V3 scan");
  const exists=await V3Decision.exists({strategyVersion:"v3-tradingagents-btc-shadow",candleTime:latestCandle.openTime});
  if(exists){console.log(`🧠 V3 shadow: candle ${latestCandle.openTime} already evaluated`);return;}
  const state=await runTradingAgentsShadow();
  await V3Decision.findOneAndUpdate(
   {strategyVersion:state.strategyVersion,candleTime:state.candleTime},
   state,{upsert:true,new:true,setDefaultsOnInsert:true}
  );
  console.log(`🧠 V3 shadow: ${state.finalDecision} (${state.confidence}%)`);
 }catch(error){ console.error("V3 shadow scan error:",error.message); }
 finally{running=false;}
}

export function startV3ShadowScanner(){
 if(process.env.V3_SHADOW_ENABLED!=="true"){console.log("🧠 V3 shadow scanner disabled");return;}
 if(timer)return;
 scanV3Shadow();
 timer=setInterval(scanV3Shadow,INTERVAL_MS);
 console.log(`🧠 V3 TradingAgents shadow scanner started (${Math.round(INTERVAL_MS/60000)}m)`);
}
