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

      // =========================
      // LIVE ANALYTICS
      // =========================

      trade.currentPrice =
        currentPrice;

      trade.tradeDurationSeconds =
        Math.floor(
          (Date.now() -
            trade.openTime) /
            1000
        );

      if (
        trade.signal ===
        "BUY"
      ) {
        if (
          currentPrice >
          trade.maxFavorablePrice
        ) {
          trade.maxFavorablePrice =
            currentPrice;
        }

        if (
          trade.maxAdversePrice ===
            0 ||
          currentPrice <
            trade.maxAdversePrice
        ) {
          trade.maxAdversePrice =
            currentPrice;
        }

        trade.highestProfitPoints =
          Math.max(
            trade.highestProfitPoints,
            trade.maxFavorablePrice -
              trade.entry
          );

        trade.lowestDrawdownPoints =
          Math.max(
            trade.lowestDrawdownPoints,
            trade.entry -
              trade.maxAdversePrice
          );
      }

      if (
        trade.signal ===
        "SELL"
      ) {
        if (
          trade.maxFavorablePrice ===
            0 ||
          currentPrice <
            trade.maxFavorablePrice
        ) {
          trade.maxFavorablePrice =
            currentPrice;
        }

        if (
          currentPrice >
          trade.maxAdversePrice
        ) {
          trade.maxAdversePrice =
            currentPrice;
        }

        trade.highestProfitPoints =
          Math.max(
            trade.highestProfitPoints,
            trade.entry -
              trade.maxFavorablePrice
          );

        trade.lowestDrawdownPoints =
          Math.max(
            trade.lowestDrawdownPoints,
            trade.maxAdversePrice -
              trade.entry
          );
      }

      // =========================
      // BUY
      // =========================

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

          trade.tp1Hit =
            true;

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

          trade.tp2Hit =
            true;

          trade.tradeJourney =
            trade.tp1Hit
              ? "TP1_THEN_TP2"
              : "DIRECT_TP2";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.tradeDurationSeconds =
            Math.floor(
              (trade.closeTime -
                trade.openTime) /
                1000
            );

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

          trade.tradeJourney =
            trade.tp1Hit
              ? "TP1_THEN_SL"
              : "DIRECT_SL";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.tradeDurationSeconds =
            Math.floor(
              (trade.closeTime -
                trade.openTime) /
                1000
            );

          trade.pnlPoints =
            -trade.riskPoints;

          await trade.save();

          console.log(
            `❌ SL HIT ${trade._id}`
          );

          continue;
        }
      }

      // =========================
      // SELL
      // =========================

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

          trade.tp1Hit =
            true;

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

          trade.tp2Hit =
            true;

          trade.tradeJourney =
            trade.tp1Hit
              ? "TP1_THEN_TP2"
              : "DIRECT_TP2";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.tradeDurationSeconds =
            Math.floor(
              (trade.closeTime -
                trade.openTime) /
                1000
            );

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

          trade.tradeJourney =
            trade.tp1Hit
              ? "TP1_THEN_SL"
              : "DIRECT_SL";

          trade.status =
            "CLOSED";

          trade.closeTime =
            Date.now();

          trade.tradeDurationSeconds =
            Math.floor(
              (trade.closeTime -
                trade.openTime) /
                1000
            );

          trade.pnlPoints =
            -trade.riskPoints;

          await trade.save();

          console.log(
            `❌ SL HIT ${trade._id}`
          );

          continue;
        }
      }

      // Save live analytics
      await trade.save();
    }

  } catch (error) {
    console.error(error);
  }
};

export default monitorTrades;
