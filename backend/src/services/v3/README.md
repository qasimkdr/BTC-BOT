# V3 TradingAgents BTC

This directory is the Node-side integration boundary for the complete TauricResearch/TradingAgents workflow.

V2 is intentionally untouched. V3 remains SHADOW-only until separately validated.

The upstream framework is Python-first; the integration will preserve its workflow semantics while using BTC-BOT's existing Node API, MongoDB trade history, candles and deterministic execution management. A Python sidecar may be used for upstream graph components rather than inaccurately rewriting their behavior.
