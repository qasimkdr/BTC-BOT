import Trade from "../../models/Trade.js";

const monitorTrades = async (
  currentPrice
) => {
  try {
    const activeTrades =
      await Trade.find({
        status: "ACTIVE",
      });

    for (const trade of activeTrades) {
      // BUY
      if (
        trade.signal ===
        "BUY"
      ) {
        if (
          trade.result ===
            "OPEN" &&
          currentPrice >=
            trade.takeProfit1
        ) {
          trade.result =
            "TP1_HIT";

          await trade.save();

          console.log(
            `✅ TP1 HIT ${trade._id}`
          );
        }

        if (
          currentPrice >=
          trade.takeProfit2
        ) {
          trade.result =
            "TP2_HIT";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.pnlPoints =
            trade.rewardPoints;

          await trade.save();

          console.log(
            `🚀 TP2 HIT ${trade._id}`
          );

          continue;
        }

        if (
          currentPrice <=
          trade.stopLoss
        ) {
          trade.result =
            "SL_HIT";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.pnlPoints =
            -trade.riskPoints;

          await trade.save();

          console.log(
            `❌ SL HIT ${trade._id}`
          );

          continue;
        }
      }

      // SELL
      if (
        trade.signal ===
        "SELL"
      ) {
        if (
          trade.result ===
            "OPEN" &&
          currentPrice <=
            trade.takeProfit1
        ) {
          trade.result =
            "TP1_HIT";

          await trade.save();

          console.log(
            `✅ TP1 HIT ${trade._id}`
          );
        }

        if (
          currentPrice <=
          trade.takeProfit2
        ) {
          trade.result =
            "TP2_HIT";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.pnlPoints =
            trade.rewardPoints;

          await trade.save();

          console.log(
            `🚀 TP2 HIT ${trade._id}`
          );

          continue;
        }

        if (
          currentPrice >=
          trade.stopLoss
        ) {
          trade.result =
            "SL_HIT";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.pnlPoints =
            -trade.riskPoints;

          await trade.save();

          console.log(
            `❌ SL HIT ${trade._id}`
          );

          continue;
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
};

export default monitorTrades;