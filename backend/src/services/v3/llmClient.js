const endpoint=()=>process.env.V3_LLM_BASE_URL||"https://api.openai.com/v1";
const model=tier=>tier==="deep"?(process.env.V3_LLM_DEEP_MODEL||process.env.V3_LLM_MODEL||"gpt-5"):(process.env.V3_LLM_QUICK_MODEL||process.env.V3_LLM_MODEL||"gpt-5-mini");
const timeoutMs=()=>Math.max(Number(process.env.V3_LLM_TIMEOUT_MS)||45000,5000);
const retries=()=>Math.min(Math.max(Number(process.env.V3_LLM_RETRIES)||2,0),5);
const extractJson=text=>{try{return JSON.parse(text)}catch{}const m=String(text||"").match(/\{[\s\S]*\}/);if(!m)throw new Error("LLM did not return JSON");return JSON.parse(m[0])};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export async function invokeV3LLM(system,payload,tier="quick"){
 if(!process.env.V3_LLM_API_KEY)throw new Error("V3_LLM_API_KEY is not configured");
 let last;
 for(let attempt=0;attempt<=retries();attempt++){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs());
  try{
   const response=await fetch(`${endpoint()}/chat/completions`,{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.V3_LLM_API_KEY}`},body:JSON.stringify({model:model(tier),temperature:0.2,response_format:{type:"json_object"},messages:[{role:"system",content:system},{role:"user",content:JSON.stringify(payload)}]})});
   if(!response.ok){const body=await response.text();const e=new Error(`V3 LLM HTTP ${response.status}: ${body.slice(0,500)}`);e.retryable=response.status===429||response.status>=500;throw e}
   const data=await response.json();return extractJson(data?.choices?.[0]?.message?.content);
  }catch(error){last=error;if(attempt>=retries()||(!error.retryable&&error.name!=="AbortError"))throw error;await sleep(500*(2**attempt))}
  finally{clearTimeout(timer)}
 }
 throw last;
}
