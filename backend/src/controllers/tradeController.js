import Trade from "../models/Trade.js";

export const getTrades =
  async (req, res) => {
    try {
      const trades =
        await Trade.find()
          .sort({
            createdAt: -1,
          })
          .limit(50);

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

      


      const trade =
        await Trade.findOne({
          status: "ACTIVE",
        }).sort({
          createdAt: -1,
        });

    


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
