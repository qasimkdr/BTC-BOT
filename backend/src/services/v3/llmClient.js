const endpoint=()=>String(process.env.V3_LLM_BASE_URL||"https://api.openai.com/v1").replace(/\/+$/,"");
const primaryModel=tier=>tier==="deep"?(process.env.V3_LLM_DEEP_MODEL||process.env.V3_LLM_MODEL||"gpt-5"):(process.env.V3_LLM_QUICK_MODEL||process.env.V3_LLM_MODEL||"gpt-5-mini");
const timeoutMs=()=>Math.max(Number(process.env.V3_LLM_TIMEOUT_MS)||45000,5000);
const retries=()=>Math.min(Math.max(Number(process.env.V3_LLM_RETRIES)||2,0),5);
const extractJson=text=>{try{return JSON.parse(text)}catch{}const m=String(text||"").match(/\{[\s\S]*\}/);if(!m)throw new Error("LLM did not return JSON");return JSON.parse(m[0])};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fallbackModels=tier=>{
 const configured=(tier==="deep"?process.env.V3_LLM_DEEP_FALLBACK_MODELS:process.env.V3_LLM_QUICK_FALLBACK_MODELS)||process.env.V3_LLM_FALLBACK_MODELS;
 const defaults=endpoint().includes("generativelanguage.googleapis.com")?"gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash-lite":"";
 return String(configured??defaults).split(",").map(x=>x.trim()).filter(Boolean);
};
const modelChain=tier=>[primaryModel(tier),...fallbackModels(tier)].filter((v,i,a)=>a.indexOf(v)===i);

async function callModel(system,payload,selectedModel){
 let last;
 for(let attempt=0;attempt<=retries();attempt++){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs());
  try{
   const response=await fetch(`${endpoint()}/chat/completions`,{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.V3_LLM_API_KEY}`},body:JSON.stringify({model:selectedModel,temperature:0.2,response_format:{type:"json_object"},messages:[{role:"system",content:system},{role:"user",content:JSON.stringify(payload)}]})});
   if(!response.ok){const body=await response.text();const e=new Error(`V3 LLM HTTP ${response.status}: ${body.slice(0,500)}`);e.status=response.status;e.retryable=response.status===429||response.status>=500;throw e}
   const data=await response.json();return extractJson(data?.choices?.[0]?.message?.content);
  }catch(error){last=error;if(attempt>=retries()||(!error.retryable&&error.name!=="AbortError"))throw error;await sleep(Math.min(2000*(2**attempt),15000))}
  finally{clearTimeout(timer)}
 }
 throw last;
}

export async function invokeV3LLM(system,payload,tier="quick"){
 if(!process.env.V3_LLM_API_KEY)throw new Error("V3_LLM_API_KEY is not configured");
 let last;
 const chain=modelChain(tier);
 for(let i=0;i<chain.length;i++){
  try{
   if(i>0)console.warn(`V3 LLM fallback: trying ${chain[i]} after ${chain[i-1]}`);
   return await callModel(system,payload,chain[i]);
  }catch(error){
   last=error;
   const canFallback=error?.status===429||error?.status===503||error?.status===404||error?.name==="AbortError";
   if(!canFallback||i===chain.length-1)throw error;
  }
 }
 throw last;
}
