import axios from "axios";

const getJson=async(url,config={})=>{try{return (await axios.get(url,{timeout:8000,...config})).data}catch{return null}};
const num=v=>Number.isFinite(Number(v))?Number(v):null;

export async function getCryptoIntelligence(){
 const [ticker,funding,oi,fg]=await Promise.all([
  getJson("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
  getJson("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"),
  getJson("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT"),
  getJson("https://api.alternative.me/fng/?limit=1&format=json"),
 ]);
 return {
  capturedAt:Date.now(),
  spot24h:ticker?{price:num(ticker.lastPrice),changePct:num(ticker.priceChangePercent),quoteVolume:num(ticker.quoteVolume),high:num(ticker.highPrice),low:num(ticker.lowPrice)}:null,
  derivatives:{
   fundingRate:num(funding?.lastFundingRate),
   markPrice:num(funding?.markPrice),
   indexPrice:num(funding?.indexPrice),
   nextFundingTime:num(funding?.nextFundingTime),
   openInterestBTC:num(oi?.openInterest)
  },
  sentiment:fg?.data?.[0]?{fearGreedValue:num(fg.data[0].value),classification:fg.data[0].value_classification,timestamp:num(fg.data[0].timestamp)*1000}:null,
  provenance:{
   spot24h:"Binance public market-data API",
   derivatives:"Binance Futures public market-data API",
   sentiment:"Alternative.me Fear & Greed public API"
  }
 };
}
