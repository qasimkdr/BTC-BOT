import Trade from "../../models/Trade.js";

const createTrade = async (
  signalData
) => {
  try {
    if (
      signalData.signal ===
      "NONE"
    ) {
      return null;
    }

    const riskPoints =
      Math.abs(
        signalData.entry -
          signalData.stopLoss
      );

    const rewardPoints =
      Math.abs(
        signalData.takeProfit2 -
          signalData.entry
      );

    const trade =
      await Trade.create({
        signal:
          signalData.signal,

        score:
          signalData.score,

        entry:
          signalData.entry,

        currentPrice:
          signalData.currentPrice,

        stopLoss:
          signalData.stopLoss,

        takeProfit1:
          signalData.takeProfit1,

        takeProfit2:
          signalData.takeProfit2,

        riskPoints,

        rewardPoints,

        pnlPoints: 0,

        openTime:
          Date.now(),

        // Analytics
        tradeDurationSeconds: 0,

        tp1Hit: false,

        tp2Hit: false,

        highestProfitPoints: 0,

        lowestDrawdownPoints: 0,

        maxFavorablePrice:
          signalData.entry,

        maxAdversePrice:
          signalData.entry,

        // Signal Snapshot
        buyPressure:
          signalData.buyPressure,

        sellPressure:
          signalData.sellPressure,

        trend:
          signalData.structure
            ?.trend,

        bullishEMA:
          signalData.reasons
            ?.bullishEMA,

        bearishEMA:
          signalData.reasons
            ?.bearishEMA,

        volumeSpike:
          signalData.volume
            ?.volumeSpike,

        liquidity:
          signalData.liquidity
            ?.detected,

        liquidityType:
          signalData.liquidity
            ?.type,

        session:
          signalData.session
            ?.validTradingTime,
      });

    console.log(
      "Trade Created:",
      trade._id
    );

    return trade;
  } catch (error) {
    console.error(error);
  }
};

export default createTrade;
