import V3Decision from "../models/V3Decision.js";
import { runTradingAgentsShadow } from "../services/v3/agentRunner.js";
import { WORKFLOW } from "../services/v3/workflow.js";
import tradingAgentsV3Config from "../services/v3/tradingAgentsConfig.js";
import { getV3Performance } from "../services/v3/performance.js";

export async function runV3Shadow(req,res) {
  try {
    const state = await runTradingAgentsShadow();
    const saved = await V3Decision.findOneAndUpdate(
      { strategyVersion: state.strategyVersion, candleTime: state.candleTime },
      state, { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(saved);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getV3Status(req,res) {
  const latest = await V3Decision.findOne({ strategyVersion: tradingAgentsV3Config.strategyVersion }).sort({candleTime:-1}).lean();
  res.json({ config: tradingAgentsV3Config, workflow: WORKFLOW, llmConfigured:Boolean(process.env.V3_LLM_API_KEY), latest });
}

export async function getV3PerformanceStats(req,res) {
  try { res.json(await getV3Performance()); } catch(error) { res.status(500).json({error:error.message}); }
}

export async function getV3Decisions(req,res) {
  const limit = Math.min(Math.max(Number(req.query.limit)||50,1),250);
  const decisions = await V3Decision.find({strategyVersion: tradingAgentsV3Config.strategyVersion}).sort({candleTime:-1}).limit(limit).lean();
  res.json({ count: decisions.length, decisions });
}
