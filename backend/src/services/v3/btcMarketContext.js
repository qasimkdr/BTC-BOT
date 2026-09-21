import Candle15m from "../../models/Candle15m.js";
import Candle1h from "../../models/Candle1h.js";
import Candle4h from "../../models/Candle4h.js";
import { calculateEMAStandard, calculateWilderATR, calculateWilderRSI } from "../analysis/indicatorUtilsV3.js";

const emaSeries=(values,period)=>{if(values.length<period)return null;let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period,k=2/(period+1);for(let i=period;i<values.length;i++)e=values[i]*k+e*(1-k);return e};
const frame = (candles) => {
 if(!candles?.length)return null;
 const ordered=[...candles].sort((a,b)=>a.openTime-b.openTime),last=ordered.at(-1);
 const closes=ordered.map(c=>Number(c.close)),ema50=calculateEMAStandard(ordered,50),ema200=calculateEMAStandard(ordered,200),atr=calculateWilderATR(ordered,14),rsi=calculateWilderRSI(ordered,14);
 const ema12=emaSeries(closes,12),ema26=emaSeries(closes,26),macd=ema12!=null&&ema26!=null?ema12-ema26:null;
 const window20=ordered.slice(-20),mean20=window20.reduce((s,c)=>s+Number(c.close),0)/window20.length;
 const variance20=window20.reduce((s,c)=>s+(Number(c.close)-mean20)**2,0)/window20.length,std20=Math.sqrt(variance20);
 const volume20=window20.reduce((s,c)=>s+Number(c.volume||0),0);
 const vwma20=volume20?window20.reduce((s,c)=>s+Number(c.close)*Number(c.volume||0),0)/volume20:null;
 const structure=ordered.slice(-50);
 return {openTime:last.openTime,close:last.close,volume:last.volume,ema50,ema200,atr,rsi,macd,
  bollinger20:{middle:mean20,upper:mean20+2*std20,lower:mean20-2*std20},vwma20,
  support50:Math.min(...structure.map(c=>Number(c.low))),resistance50:Math.max(...structure.map(c=>Number(c.high))),
  atrPct:last.close?(atr/last.close)*100:0,
  trend:ema50&&ema200?(last.close>ema50&&ema50>ema200?"BULLISH":last.close<ema50&&ema50<ema200?"BEARISH":"MIXED"):"UNKNOWN"};
};

export async function buildBtcMarketContext(){
 const [m15,h1,h4]=await Promise.all([Candle15m.find().sort({openTime:-1}).limit(250).lean(),Candle1h.find().sort({openTime:-1}).limit(250).lean(),Candle4h.find().sort({openTime:-1}).limit(250).lean()]);
 const context={m15:frame(m15),h1:frame(h1),h4:frame(h4)};
 if(!context.m15||m15.length<200)throw new Error("V3 requires at least 200 stored 15m candles");
 if(!context.h1||h1.length<200)throw new Error("V3 requires at least 200 stored 1h candles");
 if(!context.h4||h4.length<200)throw new Error("V3 requires at least 200 stored 4h candles");
 context.regime=context.h4?.trend===context.h1?.trend?context.h1?.trend:"MIXED";
 context.candleTime=context.m15.openTime;
 return context;
}
