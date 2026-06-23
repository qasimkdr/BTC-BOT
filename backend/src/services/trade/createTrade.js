import Trade from "../../models/Trade.js";

const createTrade =
  async (signalData) => {
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