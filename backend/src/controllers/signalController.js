import Candle15m from "../models/Candle15m.js";
import Signal from "../models/Signal.js";

import signalEngine from "../services/analysis/signalEngine.js";

export const result = signalEngine(candles);

return res.json({
  ok: true,
});

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