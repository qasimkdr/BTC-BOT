import Candle15m from "../models/Candle15m.js";
import signalEngine from "../services/analysis/signalEngine.js";

const WINDOW_SIZE = 10000;
const WINDOWS = 3;
const WARMUP = 250;
const COST_R = 0.05;
const PLANS = ["LOCK_TP1", "ORIGINAL_SL"];

const round=(v,d=3)=>{if(!Number.isFinite(v))return 0;const f=10**d;return Math.round(v*f)/f;};

const summarize=(logs,cost=0)=>{
  const rows=logs.map(t=>({...t,netR:t.r-cost}));
  const trades=rows.length,wins=rows.filter(t=>t.netR>0).length;
  const totalR=rows.reduce((s,t)=>s+t.netR,0);
  const gw=rows.reduce((s,t)=>s+Math.max(t.netR,0),0),gl=Math.abs(rows.reduce((s,t)=>s+Math.min(t.netR,0),0));
  let eq=0,peak=0,dd=0,streak=0,maxStreak=0;
  rows.forEach(t=>{eq+=t.netR;peak=Math.max(peak,eq);dd=Math.max(dd,peak-eq);if(t.netR<0){streak++;maxStreak=Math.max(maxStreak,streak);}else streak=0;});
  const tp2=logs.filter(t=>t.result==="TP2").length,tp1Exit=logs.filter(t=>t.result==="TP1_EXIT").length,sl=logs.filter(t=>t.result==="SL").length;
  const touchedTp1=logs.filter(t=>t.touchedTp1).length;
  return {trades,wins,losses:trades-wins,winRate:trades?round(wins/trades*100,2):0,tp2,tp2Rate:trades?round(tp2/trades*100,2):0,tp1Exit,sl,touchedTp1,tp1TouchRate:trades?round(touchedTp1/trades*100,2):0,expectancyR:trades?round(totalR/trades):0,profitFactor:gl>0?round(gw/gl):gw>0?null:0,totalR:round(totalR),maxDrawdownR:round(dd),maxLosingStreak:maxStreak};
};

const simulate=(candles,plan)=>{
  const logs=[];let i=WARMUP-1;
  while(i<candles.length-1){
    const sig=signalEngine(candles.slice(0,i+1));
    if(!sig||sig.signal==="NONE"){i++;continue;}
    let filled=false,touchedTp1=false,result=null,close=i;
    for(let j=i+1;j<candles.length;j++){
      const c=candles[j];
      if(!filled){const touch=sig.signal==="BUY"?c.low<=sig.entry:c.high>=sig.entry;if(!touch)continue;filled=true;}
      if(sig.signal==="BUY"){
        const sl=c.low<=sig.stopLoss,tp1=c.high>=sig.takeProfit1,tp2=c.high>=sig.takeProfit2;
        if(plan==="LOCK_TP1"){
          if(!touchedTp1&&sl&&tp1){result="SL";close=j;break;}
          if(touchedTp1&&c.low<=sig.takeProfit1&&tp2){result="TP1_EXIT";close=j;break;}
          if(!touchedTp1&&sl){result="SL";close=j;break;}
          if(tp2){touchedTp1=true;result="TP2";close=j;break;}
          if(!touchedTp1&&tp1){touchedTp1=true;continue;}
          if(touchedTp1&&c.low<=sig.takeProfit1){result="TP1_EXIT";close=j;break;}
        } else {
          if(sl&&tp2){result="SL";close=j;break;}
          if(sl){result="SL";close=j;break;}
          if(tp2){touchedTp1=true;result="TP2";close=j;break;}
          if(tp1)touchedTp1=true;
        }
      } else {
        const sl=c.high>=sig.stopLoss,tp1=c.low<=sig.takeProfit1,tp2=c.low<=sig.takeProfit2;
        if(plan==="LOCK_TP1"){
          if(!touchedTp1&&sl&&tp1){result="SL";close=j;break;}
          if(touchedTp1&&c.high>=sig.takeProfit1&&tp2){result="TP1_EXIT";close=j;break;}
          if(!touchedTp1&&sl){result="SL";close=j;break;}
          if(tp2){touchedTp1=true;result="TP2";close=j;break;}
          if(!touchedTp1&&tp1){touchedTp1=true;continue;}
          if(touchedTp1&&c.high>=sig.takeProfit1){result="TP1_EXIT";close=j;break;}
        } else {
          if(sl&&tp2){result="SL";close=j;break;}
          if(sl){result="SL";close=j;break;}
          if(tp2){touchedTp1=true;result="TP2";close=j;break;}
          if(tp1)touchedTp1=true;
        }
      }
    }
    if(!filled||!result){i++;continue;}
    const r=result==="TP2"?2:result==="TP1_EXIT"?1:-1;
    logs.push({signal:sig.signal,result,r,touchedTp1,signalTime:candles[i]?.openTime});
    i=close+1;
  }
  return logs;
};

export const compareManagementPlans=async(req,res)=>{
 try{
  const newest=await Candle15m.find().sort({openTime:-1}).limit(WINDOW_SIZE*WINDOWS).lean();const all=newest.reverse();
  if(all.length<WINDOW_SIZE*WINDOWS)return res.status(400).json({message:"Management comparison requires 30,000 stored 15m candles.",availableCandles:all.length,requiredCandles:30000});
  const windows=[];const aggregate={LOCK_TP1:[],ORIGINAL_SL:[]};
  for(let w=0;w<WINDOWS;w++){
   const candles=all.slice(w*WINDOW_SIZE,(w+1)*WINDOW_SIZE);const plans={};
   for(const plan of PLANS){const logs=simulate(candles,plan);aggregate[plan].push(...logs);plans[plan]={gross:summarize(logs),costStress:summarize(logs,COST_R)};}
   windows.push({window:w+1,label:w===2?"Latest":`Historical window ${w+1}`,startTime:candles[0]?.openTime,endTime:candles.at(-1)?.openTime,plans});
  }
  const results={};for(const plan of PLANS)results[plan]={gross:summarize(aggregate[plan]),costStress:summarize(aggregate[plan],COST_R)};
  res.json({version:"v2-management-30k-v1",liveTradingChanged:false,plans:{LOCK_TP1:"Current: after TP1, exit if price retests TP1; TP2 = +2R.",ORIGINAL_SL:"Requested: TP1 is informational only. Hold until TP2 = +2R or original SL = -1R."},costStressRPerTrade:COST_R,aggregate:results,windows,note:"15m OHLC cannot reveal intrabar order when TP2 and SL are both touched in one candle, so ambiguous ORIGINAL_SL candles are resolved conservatively as SL."});
 }catch(e){console.error(e);res.status(500).json({message:e.message});}
};
export default compareManagementPlans;
