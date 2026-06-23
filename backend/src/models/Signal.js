import mongoose from "mongoose";

const signalSchema = new mongoose.Schema(
  {
    signal: String,

    score: Number,

    entry: Number,

    stopLoss: Number,

    takeProfit1: Number,

    takeProfit2: Number,

    trend: String,

    status: {
      type: String,
      default: "OPEN",
    },

    candleTime: Number,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Signal",
  signalSchema
);