import mongoose from "mongoose";

const v3DecisionSchema = new mongoose.Schema({
  strategyVersion: { type: String, default: "v3-tradingagents-btc-shadow", index: true },
  symbol: { type: String, default: "BTCUSDT", index: true },
  candleTime: { type: Number, required: true, index: true },
  mode: { type: String, default: "SHADOW" },
  marketSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  analystReports: { type: mongoose.Schema.Types.Mixed, default: {} },
  investmentDebate: { type: mongoose.Schema.Types.Mixed, default: {} },
  traderPlan: { type: mongoose.Schema.Types.Mixed, default: {} },
  riskDebate: { type: mongoose.Schema.Types.Mixed, default: {} },
  finalDecision: { type: String, enum: ["BUY","SELL","SKIP"], default: "SKIP", index: true },
  confidence: { type: Number, default: 0 },
  rationale: { type: String, default: "" },
  reflection: { type: mongoose.Schema.Types.Mixed, default: {} },
  shadowPlan: { type: mongoose.Schema.Types.Mixed, default: null },
  shadowOutcome: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

v3DecisionSchema.index({ strategyVersion: 1, candleTime: -1 });
export default mongoose.model("V3Decision", v3DecisionSchema);
