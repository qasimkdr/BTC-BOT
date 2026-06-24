import Trade from "../models/Trade.js";

export const getTrades =
  async (req, res) => {
    try {
      const trades =
        await Trade.find()
          .sort({
            createdAt: -1,
          })
          .limit(10);

      res.status(200).json(
        trades
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message,
      });
    }
  };

export const getActiveTrade =
  async (req, res) => {
    try {

      const trades =
        await Trade.find()
          .sort({
            createdAt: -1,
          })
          .limit(5);

      console.log(
        "LATEST TRADES:"
      );

      console.log(trades);

      const trade =
        await Trade.findOne({
          status: "ACTIVE",
        }).sort({
          createdAt: -1,
        });

      console.log(
        "ACTIVE TRADE:"
      );

      console.log(trade);

      res.status(200).json(
        trade
      );

    } catch (error) {
      res.status(500).json({
        message:
          error.message,
      });
    }
  };