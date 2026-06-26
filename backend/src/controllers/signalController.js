import Candle15m from "../models/Candle15m.js";
import Signal from "../models/Signal.js";

import signalEngine from "../services/analysis/signalEngine.js";

export const testSignal = async (
  req,
  res
) => {
  try {
    const candles =
      (
        await Candle15m.find()
          .sort({
            openTime: -1,
          })
          .limit(500)
      ).reverse();

    const result =
      signalEngine(candles);

    res.status(200).json({
      signal:
        result.signal,

      score:
        result.score,

      buyPressure:
        result.buyPressure,

      sellPressure:
        result.sellPressure,

      currentPrice:
        candles[
          candles.length - 1
        ]?.close,

      entry:
        result.entry,

      stopLoss:
        result.stopLoss,

      takeProfit1:
        result.takeProfit1,

      takeProfit2:
        result.takeProfit2,

      trend:
        result.structure
          ?.trend,

      bos:
        result.structure
          ?.bos,

      choch:
        result.structure
          ?.choch,

      ema200:
        result.ema200,

      atr:
        result.atr,

      liquidity:
        result.liquidity
          ?.detected,

      liquidityType:
        result.liquidity
          ?.type,

      volumeSpike:
        result.volume
          ?.volumeSpike,

      volumeRatio:
        result.volume
          ?.ratio,

      session:
        result.session
          ?.validTradingTime,

      bullishEMA:
        result.reasons
          ?.bullishEMA,

      bearishEMA:
        result.reasons
          ?.bearishEMA,

      conditions: {
        Trend:
          result.structure
            ?.trend ===
            "bullish" ||
          result.structure
            ?.trend ===
            "bearish",

        EMA:
          result.reasons
            ?.bullishEMA ||
          result.reasons
            ?.bearishEMA,

        Volume:
          result.reasons
            ?.volumeSpike,

        Liquidity:
          result.reasons
            ?.liquidity,

        Session:
          result.reasons
            ?.session,
      },
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message,
    });
  }
};

export const getSignals =
  async (req, res) => {
    try {
      const signals =
        await Signal.find()
          .sort({
            createdAt: -1,
          })
          .limit(50);

      res.status(200).json(
        signals
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message,
      });
    }
  };


export const getSignalHistory =
  async (req, res) => {
    try {
      const signals =
        await Signal.find()
          .sort({
            createdAt: 1,
          })
          .limit(200);

      res.json(signals);
    } catch (error) {
      res.status(500).json({
        message:
          error.message,
      });
    }
  };

  export const getCurrentSignal =
  async (req, res) => {
    try {
      const signal =
        await Signal.findOne()
          .sort({
            createdAt: -1,
          });

      res.json(signal);
    } catch (error) {
      res.status(500).json({
        message:
          error.message,
      });
    }
  };