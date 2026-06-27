import mongoose from "mongoose";

const tradeSchema =
  new mongoose.Schema(
    {
      signal: {
        type: String,
        required: true,
      },

      score: {
        type: Number,
        default: 0,
      },

      entry: Number,

      currentPrice: Number,

      stopLoss: Number,

      takeProfit1: Number,

      takeProfit2: Number,

      // Risk / Reward
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

      // Trade Status
      result: {
        type: String,
        default: "OPEN",
      },

      tradeJourney: {
        type: String,
        default: "OPEN",
      },

      status: {
        type: String,
        default: "ACTIVE",
      },

      openTime: Number,

      closeTime: Number,

      // ===========================
      // ANALYTICS
      // ===========================

      tradeDurationSeconds: {
        type: Number,
        default: 0,
      },

      tp1Hit: {
        type: Boolean,
        default: false,
      },

      tp2Hit: {
        type: Boolean,
        default: false,
      },

      highestProfitPoints: {
        type: Number,
        default: 0,
      },

      lowestDrawdownPoints: {
        type: Number,
        default: 0,
      },

      maxFavorablePrice: {
        type: Number,
        default: 0,
      },

      maxAdversePrice: {
        type: Number,
        default: 0,
      },

      // ===========================
      // SIGNAL SNAPSHOT
      // ===========================

      buyPressure: {
        type: Number,
        default: 0,
      },

      sellPressure: {
        type: Number,
        default: 0,
      },

      trend: {
        type: String,
      },

      bullishEMA: {
        type: Boolean,
        default: false,
      },

      bearishEMA: {
        type: Boolean,
        default: false,
      },

      volumeSpike: {
        type: Boolean,
        default: false,
      },

      liquidity: {
        type: Boolean,
        default: false,
      },

      liquidityType: {
        type: String,
      },

      session: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Trade",
  tradeSchema
);
