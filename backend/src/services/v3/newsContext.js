import axios from "axios";
const clean=s=>String(s||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const parse=xml=>[...String(xml).matchAll(/<item[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?(?:<pubDate>([\s\S]*?)<\/pubDate>)?/gi)].slice(0,20).map(m=>({title:clean(m[1]),publishedAt:clean(m[2])||null})).filter(x=>x.title);
const feeds=()=>[process.env.V3_NEWS_RSS_URL||"https://www.coindesk.com/arc/outboundfeeds/rss/",process.env.V3_NEWS_RSS_URL_2,process.env.V3_MACRO_NEWS_RSS_URL].filter(Boolean);
export async function getCryptoNewsContext(){
 const capturedAt=Date.now();
 const results=await Promise.all(feeds().map(async source=>{try{const {data}=await axios.get(source,{timeout:8000,responseType:"text",headers:{"User-Agent":"BTC-BOT-V3/1.0"}});return {source,items:parse(data)}}catch(error){return {source,items:[],error:error.message}}}));
 const seen=new Set(),items=[];
 for(const r of results)for(const item of r.items){const k=item.title.toLowerCase();if(!seen.has(k)){seen.add(k);items.push({...item,source:r.source})}}
 return {capturedAt,sources:results.map(r=>({source:r.source,available:r.items.length>0,error:r.error||null})),available:items.length>0,items:items.slice(0,30)};
}
