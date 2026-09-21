# BTC TradingAgents V3 Integration

Upstream: TauricResearch/TradingAgents (Apache-2.0).

Goal: preserve the complete TradingAgents workflow—analysts, researchers/debate, research manager, trader, risk-management debate, final manager, memory/reflection, graph orchestration and backtesting concepts—while replacing stock-specific market inputs with BTC/crypto inputs and keeping BTC-BOT V2 untouched.

## Rollout

V3 starts in SHADOW mode. It must not execute live trades until forward evidence shows it adds value versus V2.

## BTC adaptation

- Market analyst: BTC 15m/1h/4h technical/structure context
- Sentiment analyst: crypto sentiment inputs
- News analyst: BTC/crypto/macro news
- Fundamentals analyst: adapted to crypto/derivatives context rather than corporate fundamentals
- Bull/Bear researchers and debate: retained
- Research manager: retained
- Trader: BUY / SELL / SKIP proposal
- Risk agents and final manager: retained
- Reflection/memory: retained
- Execution: existing BTC-BOT deterministic SL / TP1-lock / TP2 management

Do not silently promote V3 to live execution.
