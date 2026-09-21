const int=(name,fallback,min=1,max=10)=>Math.min(Math.max(Number(process.env[name])||fallback,min),max);
export const tradingAgentsV3Config = Object.freeze({
  strategyVersion:"v3-tradingagents-btc-shadow", mode:"SHADOW", liveEnabled:false,
  quickModel:process.env.V3_LLM_QUICK_MODEL||process.env.V3_LLM_MODEL||"gpt-5-mini",
  deepModel:process.env.V3_LLM_DEEP_MODEL||process.env.V3_LLM_MODEL||"gpt-5",
  maxDebateRounds:int("V3_MAX_DEBATE_ROUNDS",1,1,5),
  maxRiskRounds:int("V3_MAX_RISK_ROUNDS",1,1,5),
  workflow:["market_analyst","sentiment_analyst","social_analyst","news_analyst","crypto_fundamentals_analyst","bull_researcher","bear_researcher","research_manager","trader","risk_debate","final_risk_manager","reflection_memory"],
  decisions:["BUY","SELL","SKIP"],
  execution:{liveEnabled:false,management:"V2_TP1_LOCK"},
});
export default tradingAgentsV3Config;
