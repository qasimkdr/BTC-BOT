import { GoogleGenAI } from "@google/genai";

const timeoutMs=()=>Math.max(Number(process.env.V3_LLM_TIMEOUT_MS)||45000,5000);
const retries=()=>Math.min(Math.max(Number(process.env.V3_LLM_RETRIES)||2,0),5);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const primaryModel=tier=>tier==="deep"?(process.env.V3_LLM_DEEP_MODEL||process.env.V3_LLM_MODEL||"gemini-3.8-flash"):(process.env.V3_LLM_QUICK_MODEL||process.env.V3_LLM_MODEL||"gemini-3.8-flash");
const extractJson=text=>{try{return JSON.parse(text)}catch{}const m=String(text||"").match(/\{[\s\S]*\}/);if(!m)throw new Error("LLM did not return JSON");return JSON.parse(m[0])};
const fallbackModels=tier=>{
 const configured=(tier==="deep"?process.env.V3_LLM_DEEP_FALLBACK_MODELS:process.env.V3_LLM_QUICK_FALLBACK_MODELS)||process.env.V3_LLM_FALLBACK_MODELS||"";
 return String(configured).split(",").map(x=>x.trim()).filter(Boolean);
};
const modelChain=tier=>[primaryModel(tier),...fallbackModels(tier)].filter((v,i,a)=>a.indexOf(v)===i);
const apiKey=()=>process.env.V3_LLM_API_KEY||process.env.GEMINI_API_KEY;

function statusOf(error){
 return Number(error?.status||error?.code||String(error?.message||"").match(/\b(404|408|429|500|502|503|504)\b/)?.[1])||0;
}
function retryable(error){
 const s=statusOf(error);
 return s===408||s===429||s>=500||error?.name==="AbortError";
}

async function callModel(ai,system,payload,selectedModel){
 let last;
 for(let attempt=0;attempt<=retries();attempt++){
  try{
   const request=ai.models.generateContent({
    model:selectedModel,
    contents:JSON.stringify(payload),
    config:{systemInstruction:system,temperature:0.2,responseMimeType:"application/json"}
   });
   const response=await Promise.race([
    request,
    new Promise((_,reject)=>setTimeout(()=>{const e=new Error(`V3 LLM timeout after ${timeoutMs()}ms`);e.name="AbortError";reject(e)},timeoutMs()))
   ]);
   return extractJson(response?.text);
  }catch(error){
   last=error;
   if(attempt>=retries()||!retryable(error))throw error;
   await sleep(Math.min(2000*(2**attempt),15000));
  }
 }
 throw last;
}

export async function invokeV3LLM(system,payload,tier="quick"){
 if(!apiKey())throw new Error("V3_LLM_API_KEY is not configured");
 const ai=new GoogleGenAI({apiKey:apiKey()});
 const chain=modelChain(tier);
 let last;
 for(let i=0;i<chain.length;i++){
  try{
   if(i>0)console.warn(`V3 LLM fallback: trying ${chain[i]} after ${chain[i-1]}`);
   return await callModel(ai,system,payload,chain[i]);
  }catch(error){
   last=error;
   const status=statusOf(error);
   const canFallback=status===404||status===429||status===503||error?.name==="AbortError";
   console.warn(`V3 LLM ${chain[i]} failed${status?` HTTP ${status}`:""}: ${String(error?.message||error).slice(0,500)}`);
   if(!canFallback||i===chain.length-1)throw error;
  }
 }
 throw last;
}
