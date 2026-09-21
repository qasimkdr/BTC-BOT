import axios from "axios";
const getJson=async(url,config={})=>{try{return (await axios.get(url,{timeout:8000,...config})).data}catch{return null}};
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const pct=(a,b)=>a!=null&&b?((a-b)/b)*100:null;

export async function getCryptoIntelligence(){
 const [ticker,funding,oi,oiHist,fundingHist,longShort,taker,fg]=await Promise.all([
  getJson("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
  getJson("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"),
  getJson("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT"),
  getJson("https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=15m&limit=5"),
  getJson("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=8"),
  getJson("https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=15m&limit=5"),
  getJson("https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=15m&limit=5"),
  getJson("https://api.alternative.me/fng/?limit=1&format=json")
 ]);
 const oiRows=Array.isArray(oiHist)?oiHist:[],firstOi=num(oiRows[0]?.sumOpenInterest),lastOi=num(oiRows.at(-1)?.sumOpenInterest);
 const ls=Array.isArray(longShort)?longShort.at(-1):null,tk=Array.isArray(taker)?taker.at(-1):null;
 const fundRows=Array.isArray(fundingHist)?fundingHist:[],fundVals=fundRows.map(x=>num(x.fundingRate)).filter(Number.isFinite);
 return {capturedAt:Date.now(),
  spot24h:ticker?{price:num(ticker.lastPrice),changePct:num(ticker.priceChangePercent),quoteVolume:num(ticker.quoteVolume),high:num(ticker.highPrice),low:num(ticker.lowPrice)}:null,
  derivatives:{fundingRate:num(funding?.lastFundingRate),fundingAvg8:fundVals.length?fundVals.reduce((a,b)=>a+b,0)/fundVals.length:null,markPrice:num(funding?.markPrice),indexPrice:num(funding?.indexPrice),basisPct:funding?.markPrice&&funding?.indexPrice?pct(num(funding.markPrice),num(funding.indexPrice)):null,nextFundingTime:num(funding?.nextFundingTime),openInterestBTC:num(oi?.openInterest),openInterestChangePct:pct(lastOi,firstOi),globalLongShortRatio:num(ls?.longShortRatio),takerBuySellRatio:num(tk?.buySellRatio)},
  sentiment:fg?.data?.[0]?{fearGreedValue:num(fg.data[0].value),classification:fg.data[0].value_classification,timestamp:num(fg.data[0].timestamp)*1000}:null,
  availability:{spot:Boolean(ticker),funding:Boolean(funding),openInterest:Boolean(oi),openInterestHistory:oiRows.length>1,fundingHistory:fundVals.length>0,longShort:Boolean(ls),takerRatio:Boolean(tk),fearGreed:Boolean(fg?.data?.[0])},
  provenance:{spot24h:"Binance public market-data API",derivatives:"Binance Futures public market-data API",sentiment:"Alternative.me Fear & Greed public API"}
 };
}
