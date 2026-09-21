import axios from "axios";

const clean=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
export async function getCryptoNewsContext(){
 const url=process.env.V3_NEWS_RSS_URL||"https://www.coindesk.com/arc/outboundfeeds/rss/";
 try{
  const {data}=await axios.get(url,{timeout:8000,responseType:"text",headers:{"User-Agent":"BTC-BOT-V3/1.0"}});
  const items=[...String(data).matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/gi)]
   .slice(0,12).map(m=>({title:clean(m[1]),publishedAt:clean(m[2])}));
  return {capturedAt:Date.now(),source:url,items};
 }catch(error){return {capturedAt:Date.now(),source:url,items:[],error:error.message}}
}
