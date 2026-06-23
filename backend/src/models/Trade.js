import mongoose from "mongoose";

const tradeSchema =
  new mongoose.Schema(
    {
      signal: {
        type: String,
        required: true,
      },

      score: Number,

      entry: Number,

      stopLoss: Number,

      takeProfit1: Number,

      takeProfit2: Number,

      // NEW
      riskPoints: {
        type: Number,
        default: 0,
      },

      rewardPoints: {
        type: Number,
        default: 0,
      },

      pnlPoints: {
        type: Number,
        default: 0,
      },

      result: {
        type: String,
        default: "OPEN",
      },

      status: {
        type: String,
        default: "ACTIVE",
      },

      openTime: Number,

      closeTime: Number,
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Trade",
  tradeSchema
);