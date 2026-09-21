import axios from "axios";

const clean = v => String(v ?? "").replace(/\s+/g," ").trim().slice(0,1200);
const normalizeItems = (items, source) => Array.isArray(items) ? items.slice(0,40).map(x=>({
  source,
  text: clean(x?.text || x?.title || x?.body),
  sentiment: clean(x?.sentiment || x?.label || ""),
  publishedAt: x?.publishedAt || x?.createdAt || null,
})).filter(x=>x.text) : [];

export async function getSocialContext(){
 const url=process.env.V3_SOCIAL_CONTEXT_URL;
 if(!url) return {capturedAt:Date.now(),available:false,items:[],reason:"V3_SOCIAL_CONTEXT_URL not configured"};
 try{
  const {data}=await axios.get(url,{timeout:8000,headers:{"User-Agent":"BTC-BOT-V3/1.0"}});
  const raw=Array.isArray(data)?data:(data?.items||data?.posts||data?.messages||[]);
  return {capturedAt:Date.now(),available:true,source:url,items:normalizeItems(raw,"configured-social-feed")};
 }catch(error){
  return {capturedAt:Date.now(),available:false,source:url,items:[],reason:error.message};
 }
}
