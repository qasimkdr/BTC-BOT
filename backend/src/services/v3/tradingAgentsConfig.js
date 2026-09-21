export const tradingAgentsV3Config = Object.freeze({
  strategyVersion: "v3-tradingagents-btc-shadow",
  mode: "SHADOW",
  upstream: "TauricResearch/TradingAgents",
  workflow: [
    "market_analyst",
    "sentiment_analyst",
    "news_analyst",
    "crypto_fundamentals_analyst",
    "bull_researcher",
    "bear_researcher",
    "research_manager",
    "trader",
    "risk_debate",
    "final_risk_manager",
    "reflection_memory",
  ],
  decisions: ["BUY", "SELL", "SKIP"],
  execution: {
    liveEnabled: false,
    management: "V2_TP1_LOCK",
  },
});

export default tradingAgentsV3Config;
