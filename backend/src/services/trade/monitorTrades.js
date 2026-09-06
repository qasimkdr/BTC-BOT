import Trade from "../../models/Trade.js";

const emitTrade = (io, trade) => {
  if (io) io.emit("trade-update", trade.toObject());
};

const closeTrade = async (trade, result, journey, pnlPoints, io) => {
  trade.result = result;
  trade.tradeJourney = journey;
  trade.status = "CLOSED";
  trade.closeTime = Date.now();
  trade.tradeDurationSeconds = Math.floor((trade.closeTime - trade.openTime) / 1000);
  trade.pnlPoints = pnlPoints;
  await trade.save();
  emitTrade(io, trade);
};

const monitorTrades = async (currentPrice, io) => {
  try {
    const activeTrades = await Trade.find({ status: "ACTIVE" });

    for (const trade of activeTrades) {
      trade.currentPrice = currentPrice;
      trade.tradeDurationSeconds = Math.floor((Date.now() - trade.openTime) / 1000);

      if (trade.signal === "BUY") {
        if (currentPrice > trade.maxFavorablePrice) trade.maxFavorablePrice = currentPrice;
        if (trade.maxAdversePrice === 0 || currentPrice < trade.maxAdversePrice) trade.maxAdversePrice = currentPrice;
        trade.highestProfitPoints = Math.max(trade.highestProfitPoints, trade.maxFavorablePrice - trade.entry);
        trade.lowestDrawdownPoints = Math.max(trade.lowestDrawdownPoints, trade.entry - trade.maxAdversePrice);
      }

      if (trade.signal === "SELL") {
        if (trade.maxFavorablePrice === 0 || currentPrice < trade.maxFavorablePrice) trade.maxFavorablePrice = currentPrice;
        if (currentPrice > trade.maxAdversePrice) trade.maxAdversePrice = currentPrice;
        trade.highestProfitPoints = Math.max(trade.highestProfitPoints, trade.entry - trade.maxFavorablePrice);
        trade.lowestDrawdownPoints = Math.max(trade.lowestDrawdownPoints, trade.maxAdversePrice - trade.entry);
      }

      if (trade.signal === "BUY") {
        if (!trade.tp1Hit && currentPrice >= trade.takeProfit1) {
          trade.result = "TP1_HIT";
          trade.tp1Hit = true;
          trade.tp1Locked = true;
          trade.tp1LockTime = Date.now();
          trade.originalStopLoss = trade.originalStopLoss ?? trade.stopLoss;
          trade.stopLoss = trade.takeProfit1;
          await trade.save();
          emitTrade(io, trade);
          console.log(`✅ TP1 HIT + PROFIT LOCKED ${trade._id}`);
        }

        if (currentPrice >= trade.takeProfit2) {
          trade.tp2Hit = true;
          await closeTrade(
            trade,
            "TP2_HIT",
            trade.tp1Hit ? "TP1_THEN_TP2" : "DIRECT_TP2",
            trade.rewardPoints,
            io
          );
          console.log(`🚀 TP2 HIT ${trade._id}`);
          continue;
        }

        if (trade.tp1Locked && currentPrice <= trade.takeProfit1) {
          const lockedProfit = Math.abs(trade.takeProfit1 - trade.entry);
          await closeTrade(trade, "TP1_LOCK_HIT", "TP1_LOCKED_EXIT", lockedProfit, io);
          console.log(`💰 TP1 LOCK EXIT ${trade._id}`);
          continue;
        }

        if (!trade.tp1Locked && currentPrice <= trade.stopLoss) {
          await closeTrade(trade, "SL_HIT", "DIRECT_SL", -trade.riskPoints, io);
          console.log(`❌ SL HIT ${trade._id}`);
          continue;
        }
      }

      if (trade.signal === "SELL") {
        if (!trade.tp1Hit && currentPrice <= trade.takeProfit1) {
          trade.result = "TP1_HIT";
          trade.tp1Hit = true;
          trade.tp1Locked = true;
          trade.tp1LockTime = Date.now();
          trade.originalStopLoss = trade.originalStopLoss ?? trade.stopLoss;
          trade.stopLoss = trade.takeProfit1;
          await trade.save();
          emitTrade(io, trade);
          console.log(`✅ TP1 HIT + PROFIT LOCKED ${trade._id}`);
        }

        if (currentPrice <= trade.takeProfit2) {
          trade.tp2Hit = true;
          await closeTrade(
            trade,
            "TP2_HIT",
            trade.tp1Hit ? "TP1_THEN_TP2" : "DIRECT_TP2",
            trade.rewardPoints,
            io
          );
          console.log(`🚀 TP2 HIT ${trade._id}`);
          continue;
        }

        if (trade.tp1Locked && currentPrice >= trade.takeProfit1) {
          const lockedProfit = Math.abs(trade.entry - trade.takeProfit1);
          await closeTrade(trade, "TP1_LOCK_HIT", "TP1_LOCKED_EXIT", lockedProfit, io);
          console.log(`💰 TP1 LOCK EXIT ${trade._id}`);
          continue;
        }

        if (!trade.tp1Locked && currentPrice >= trade.stopLoss) {
          await closeTrade(trade, "SL_HIT", "DIRECT_SL", -trade.riskPoints, io);
          console.log(`❌ SL HIT ${trade._id}`);
          continue;
        }
      }

      await trade.save();
      emitTrade(io, trade);
    }
  } catch (error) {
    console.error(error);
  }
};

export default monitorTrades;
