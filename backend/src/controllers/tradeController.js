import Trade from "../models/Trade.js";

export const getTrades = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 50, 1),
      500
    );

    const trades = await Trade.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(trades);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getActiveTrade = async (req, res) => {
  try {
    const trade = await Trade.findOne({
      status: "ACTIVE",
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(trade);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const exportTrades = async (req, res) => {
  try {
    const trades = await Trade.find()
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      exportedAt: new Date().toISOString(),
      count: trades.length,
      fieldsVersion: "v2-research",
      trades,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
