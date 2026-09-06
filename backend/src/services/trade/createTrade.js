import Trade from "../../models/Trade.js";

const createTrade = async (signalData) => {
  try {
    if (signalData.signal === "NONE") {
      return null;
    }

    const riskPoints = Math.abs(
      signalData.entry - signalData.stopLoss
    );

    const rewardPoints = Math.abs(
      signalData.takeProfit2 - signalData.entry
    );

    const now = Date.now();
    const date = new Date(now);
    const ema200 = signalData.ema200 ?? null;
    const currentPrice = signalData.currentPrice;

    const trade = await Trade.create({
      signal: signalData.signal,
      strategyVersion: "v2-research",
      score: signalData.score,
      entry: signalData.entry,
      currentPrice,
      stopLoss: signalData.stopLoss,
      takeProfit1: signalData.takeProfit1,
      takeProfit2: signalData.takeProfit2,
      riskPoints,
      rewardPoints,
      pnlPoints: 0,
      openTime: now,

      tradeDurationSeconds: 0,
      tp1Hit: false,
      tp2Hit: false,
      highestProfitPoints: 0,
      lowestDrawdownPoints: 0,
      maxFavorablePrice: signalData.entry,
      maxAdversePrice: signalData.entry,

      buyPressure: signalData.buyPressure,
      sellPressure: signalData.sellPressure,
      trend: signalData.structure?.trend,
      bullishEMA: signalData.reasons?.bullishEMA,
      bearishEMA: signalData.reasons?.bearishEMA,
      ema200,
      emaDistancePoints:
        Number.isFinite(currentPrice) && Number.isFinite(ema200)
          ? currentPrice - ema200
          : null,
      atr: signalData.atr,
      volumeRatio: signalData.volume?.ratio,
      volumeSpike: signalData.volume?.volumeSpike,
      liquidity: signalData.liquidity?.detected,
      liquidityType: signalData.liquidity?.type,
      liquiditySweptLevel: signalData.liquidity?.sweptLevel,
      session: signalData.session?.validTradingTime,
      utcHour: date.getUTCHours(),
      dayOfWeek: date.getUTCDay(),
      bos: signalData.structure?.bos,
      choch: signalData.structure?.choch,
    });

    console.log("Trade Created:", trade._id);
    return trade;
  } catch (error) {
    console.error(error);
  }
};

export default createTrade;
