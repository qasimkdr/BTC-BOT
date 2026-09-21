import tradingAgentsV3Config from "./tradingAgentsConfig.js";

export const WORKFLOW = Object.freeze({
  analysts: ["market", "sentiment", "social", "news", "cryptoFundamentals"],
  investmentDebate: ["bullResearcher", "bearResearcher", "researchManager"],
  trader: ["trader"],
  riskDebate: ["aggressive", "conservative", "neutral", "finalRiskManager"],
  memory: ["reflection"],
});

const unavailable = (role) => ({
  role,
  status: "PENDING_LLM_PROVIDER",
  report: null,
});

export function createWorkflowState(marketSnapshot) {
  return {
    strategyVersion: tradingAgentsV3Config.strategyVersion,
    mode: tradingAgentsV3Config.mode,
    marketSnapshot,
    analystReports: Object.fromEntries(WORKFLOW.analysts.map((x) => [x, unavailable(x)])),
    investmentDebate: Object.fromEntries(WORKFLOW.investmentDebate.map((x) => [x, unavailable(x)])),
    traderPlan: unavailable("trader"),
    riskDebate: Object.fromEntries(WORKFLOW.riskDebate.map((x) => [x, unavailable(x)])),
    reflection: unavailable("reflection"),
    finalDecision: "SKIP",
    confidence: 0,
    rationale: "V3 is shadow-only and no LLM provider has completed the TradingAgents workflow.",
  };
}
