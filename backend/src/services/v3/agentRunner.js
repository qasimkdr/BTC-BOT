import V3Decision from "../../models/V3Decision.js";
import { invokeV3LLM } from "./llmClient.js";
import { V3_PROMPTS } from "./prompts.js";
import { buildBtcMarketContext } from "./btcMarketContext.js";
import tradingAgentsV3Config from "./tradingAgentsConfig.js";
import { getCryptoIntelligence } from "./cryptoIntelligence.js";
import { getCryptoNewsContext } from "./newsContext.js";
import { getSimilarV3Memories } from "./similarMemory.js";
import { buildV2EquivalentPlan } from "./executionPlan.js";
import { getSocialContext } from "./socialContext.js";

const safe = async (prompt,payload,tier="quick") => {
  try { return await invokeV3LLM(prompt,payload,tier); }
  catch (error) { return { unavailable: true, error: error.message }; }
};

export async function runTradingAgentsShadow() {
  const marketSnapshot = await buildBtcMarketContext();
  const [cryptoIntelligence, newsContext, socialContext] = await Promise.all([getCryptoIntelligence(), getCryptoNewsContext(), getSocialContext()]);
  const prior = await getSimilarV3Memories({...marketSnapshot,cryptoIntelligence}, 8);

  const market = await safe(V3_PROMPTS.market,{marketSnapshot});
  const sentiment = await safe(V3_PROMPTS.sentiment,{sentimentContext:cryptoIntelligence.sentiment,market24h:cryptoIntelligence.spot24h});
  const social = socialContext.available
    ? await safe(V3_PROMPTS.social,{socialContext})
    : { unavailable:true, confidence:"LOW", reason:socialContext.reason, evidence:[], limitations:[socialContext.reason] };
  const news = await safe(V3_PROMPTS.news,{newsContext});
  const cryptoFundamentals = await safe(V3_PROMPTS.cryptoFundamentals,{derivativesContext:cryptoIntelligence.derivatives,market24h:cryptoIntelligence.spot24h,marketSnapshot});
  const reports = {market,sentiment,social,news,cryptoFundamentals};
  if (market?.unavailable) throw new Error(`V3 market analyst unavailable: ${market.error}`);

  const debate = { bull: [], bear: [] };
  let bullContext=null, bearContext=null;
  for(let round=0; round<tradingAgentsV3Config.maxDebateRounds; round++){
    const bull=await safe(V3_PROMPTS.bull,{reports,round:round+1,priorBull:bullContext,opponent:bearContext},"deep");
    debate.bull.push(bull); bullContext=bull;
    const bear=await safe(V3_PROMPTS.bear,{reports,round:round+1,priorBear:bearContext,opponent:bullContext},"deep");
    debate.bear.push(bear); bearContext=bear;
  }
  const researchManager = await safe(V3_PROMPTS.researchManager,{reports,debate},"deep");
  const investmentDebate = {...debate,researchManager};

  const traderPlan = await safe(V3_PROMPTS.trader,{marketSnapshot,researchManager,marketReport:market},"deep");

  const riskRounds=[];
  let priorRisk=null;
  for(let round=0; round<tradingAgentsV3Config.maxRiskRounds; round++){
    const aggressive=await safe(V3_PROMPTS.aggressiveRisk,{traderPlan,reports,marketSnapshot,round:round+1,priorRisk},"deep");
    const conservative=await safe(V3_PROMPTS.conservativeRisk,{traderPlan,reports,marketSnapshot,round:round+1,aggressive,priorRisk},"deep");
    const neutral=await safe(V3_PROMPTS.neutralRisk,{traderPlan,reports,marketSnapshot,round:round+1,aggressive,conservative,priorRisk},"deep");
    priorRisk={aggressive,conservative,neutral}; riskRounds.push(priorRisk);
  }
  const finalRiskManager = await safe(V3_PROMPTS.finalRisk,{traderPlan,riskDebate:riskRounds,marketSnapshot},"deep");
  const riskDebate = {rounds:riskRounds,finalRiskManager};

  const reflection = await safe(V3_PROMPTS.reflection,{current:{marketSnapshot,reports,traderPlan,finalRiskManager},prior});
  const requiredUnavailable = [researchManager,traderPlan,finalRiskManager].some(x=>x?.unavailable);
  const decision = !requiredUnavailable && ["BUY","SELL"].includes(finalRiskManager?.decision) ? finalRiskManager.decision : "SKIP";
  const shadowPlan = buildV2EquivalentPlan(decision, marketSnapshot);

  return {
    strategyVersion: tradingAgentsV3Config.strategyVersion, symbol:"BTCUSDT", candleTime:marketSnapshot.candleTime,
    mode:"SHADOW", marketSnapshot:{...marketSnapshot,cryptoIntelligence,newsContext,socialContext}, analystReports:reports, investmentDebate, traderPlan, riskDebate,
    finalDecision:decision, confidence:Number(finalRiskManager?.confidence)||0,
    rationale: requiredUnavailable ? "Critical V3 reasoning stage unavailable; forced SKIP." : (finalRiskManager?.rationale || "Risk manager did not approve a directional shadow decision."),
    shadowPlan,
    reflection,
  };
}
