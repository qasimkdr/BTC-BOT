import Trade from "../models/Trade.js";

export const getStats =
  async (req, res) => {
    try {
      const trades =
        await Trade.find();

      const totalTrades =
        trades.length;

      const wins =
        trades.filter(
          (t) =>
            t.result ===
              "TP1_HIT" ||
            t.result ===
              "TP2_HIT"
        );

      const losses =
        trades.filter(
          (t) =>
            t.result ===
            "SL_HIT"
        );

      const openTrades =
        trades.filter(
          (t) =>
            t.status ===
            "ACTIVE"
        ).length;

      const winCount =
        wins.length;

      const lossCount =
        losses.length;

      const winRate =
        totalTrades > 0
          ? (
              (winCount /
                totalTrades) *
              100
            ).toFixed(2)
          : 0;

      const totalPnL =
        trades.reduce(
          (
            total,
            trade
          ) =>
            total +
            (trade.pnlPoints ||
              0),
          0
        );

      const totalWinsPnL =
        wins.reduce(
          (
            total,
            trade
          ) =>
            total +
            (trade.pnlPoints ||
              0),
          0
        );

      const totalLossPnL =
        Math.abs(
          losses.reduce(
            (
              total,
              trade
            ) =>
              total +
              (trade.pnlPoints ||
                0),
            0
          )
        );

      const averageWin =
        winCount > 0
          ? (
              totalWinsPnL /
              winCount
            ).toFixed(2)
          : 0;

      const averageLoss =
        lossCount > 0
          ? (
              totalLossPnL /
              lossCount
            ).toFixed(2)
          : 0;

      const profitFactor =
        totalLossPnL > 0
          ? (
              totalWinsPnL /
              totalLossPnL
            ).toFixed(2)
          : "∞";

      res.json({
        totalTrades,

        wins:
          winCount,

        losses:
          lossCount,

        openTrades,

        winRate,

        totalPnL,

        averageWin,

        averageLoss,

        profitFactor,
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message,
      });
    }
  };