import V3Decision from "../../models/V3Decision.js";

const n=v=>Number.isFinite(Number(v))?Number(v):null;
const distance=(a,b)=>{
 let d=0,w=0;
 const add=(x,y,weight=1,scale=1)=>{x=n(x);y=n(y);if(x===null||y===null)return;d+=Math.min(Math.abs(x-y)/scale,3)*weight;w+=weight};
 add(a?.m15?.rsi,b?.m15?.rsi,1.5,15);
 add(a?.m15?.atrPct,b?.m15?.atrPct,1.2,.4);
 add(a?.cryptoIntelligence?.spot24h?.changePct,b?.cryptoIntelligence?.spot24h?.changePct,1,3);
 add(a?.cryptoIntelligence?.derivatives?.fundingRate,b?.cryptoIntelligence?.derivatives?.fundingRate,1,.0002);
 add(a?.cryptoIntelligence?.sentiment?.fearGreedValue,b?.cryptoIntelligence?.sentiment?.fearGreedValue,1,20);
 if(a?.regime&&b?.regime){d+=(a.regime===b.regime?0:1.5);w+=1.5}
 if(a?.h1?.trend&&b?.h1?.trend){d+=(a.h1.trend===b.h1.trend?0:1);w+=1}
 if(a?.h4?.trend&&b?.h4?.trend){d+=(a.h4.trend===b.h4.trend?0:1);w+=1}
 return w?d/w:999;
};

export async function getSimilarV3Memories(snapshot,limit=8){
 const pool=await V3Decision.find({strategyVersion:"v3-tradingagents-btc-shadow",shadowOutcome:{$ne:null}})
  .sort({candleTime:-1}).limit(300).lean();
 return pool.map(x=>({score:distance(snapshot,x.marketSnapshot),decision:x.finalDecision,confidence:x.confidence,
  regime:x.marketSnapshot?.regime,outcome:x.shadowOutcome,reflection:x.reflection,candleTime:x.candleTime}))
  .sort((a,b)=>a.score-b.score).slice(0,limit);
}
