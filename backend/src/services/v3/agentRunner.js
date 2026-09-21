import V3Decision from "../../models/V3Decision.js";
import { invokeV3LLM } from "./llmClient.js";
import { V3_PROMPTS } from "./prompts.js";
import { buildBtcMarketContext } from "./btcMarketContext.js";
import tradingAgentsV3Config from "./tradingAgentsConfig.js";

const safe = async (prompt,payload) => {
  try { return await invokeV3LLM(prompt,payload); }
  catch (error) { return { unavailable: true, error: error.message }; }
};

export async function runTradingAgentsShadow() {
  const marketSnapshot = await buildBtcMarketContext();
  const prior = await V3Decision.find({ strategyVersion: tradingAgentsV3Config.strategyVersion, shadowOutcome: {$ne:null} })
    .sort({candleTime:-1}).limit(20).lean();

  const market = await safe(V3_PROMPTS.market,{marketSnapshot});
  const sentiment = await safe(V3_PROMPTS.sentiment,{sentimentContext:"No external sentiment feed configured yet"});
  const news = await safe(V3_PROMPTS.news,{newsContext:"No external news feed configured yet"});
  const cryptoFundamentals = await safe(V3_PROMPTS.cryptoFundamentals,{derivativesContext:"No derivatives/network feed configured yet",marketSnapshot});
  const reports = {market,sentiment,news,cryptoFundamentals};

  const bull = await safe(V3_PROMPTS.bull,{reports});
  const bear = await safe(V3_PROMPTS.bear,{reports,bullOpening:bull});
  const bullReply = await safe(V3_PROMPTS.bull,{reports,bearArgument:bear,bullOpening:bull});
  const bearReply = await safe(V3_PROMPTS.bear,{reports,bullArgument:bullReply,bearOpening:bear});
  const researchManager = await safe(V3_PROMPTS.researchManager,{reports,debate:{bull,bear,bullReply,bearReply}});
  const investmentDebate = {bull,bear,bullReply,bearReply,researchManager};

  const traderPlan = await safe(V3_PROMPTS.trader,{marketSnapshot,researchManager,marketReport:market});

  const aggressive = await safe(V3_PROMPTS.aggressiveRisk,{traderPlan,reports,marketSnapshot});
  const conservative = await safe(V3_PROMPTS.conservativeRisk,{traderPlan,reports,marketSnapshot});
  const neutral = await safe(V3_PROMPTS.neutralRisk,{traderPlan,reports,marketSnapshot});
  const finalRiskManager = await safe(V3_PROMPTS.finalRisk,{traderPlan,riskDebate:{aggressive,conservative,neutral},marketSnapshot});
  const riskDebate = {aggressive,conservative,neutral,finalRiskManager};

  const reflection = await safe(V3_PROMPTS.reflection,{current:{marketSnapshot,reports,traderPlan,finalRiskManager},prior});
  const decision = ["BUY","SELL"].includes(finalRiskManager?.decision) ? finalRiskManager.decision : "SKIP";

  return {
    strategyVersion: tradingAgentsV3Config.strategyVersion, symbol:"BTCUSDT", candleTime:marketSnapshot.candleTime,
    mode:"SHADOW", marketSnapshot, analystReports:reports, investmentDebate, traderPlan, riskDebate,
    finalDecision:decision, confidence:Number(finalRiskManager?.confidence)||0,
    rationale:finalRiskManager?.rationale || "Risk manager did not approve a directional shadow decision.",
    reflection,
  };
}
