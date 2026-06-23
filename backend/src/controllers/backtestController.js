import Candle15m from "../models/Candle15m.js";
import signalEngine from "../services/analysis/signalEngine.js";

export const runBacktest =
  async (req, res) => {
    try {
      const candles =
        await Candle15m.find()
          .sort({
            openTime: 1,
          });

      let tp1Wins = 0;
      let tp2Wins = 0;
      let losses = 0;

      let i = 250;

      const tradeLogs = [];

      while (
        i < candles.length - 1
      ) {
        const history =
          candles.slice(
            0,
            i
          );

        const signal =
          signalEngine(
            history
          );

        if (
          signal.signal ===
          "NONE"
        ) {
          i++;
          continue;
        }

        let result =
          null;

        let tp1Hit =
          false;

        let tradeClosedAt =
          i;

        let stopLoss =
          signal.stopLoss;

        for (
          let j = i + 1;
          j < candles.length;
          j++
        ) {
          const candle =
            candles[j];

          // BUY
          if (
            signal.signal ===
            "BUY"
          ) {
            if (
              !tp1Hit &&
              candle.high >=
                signal.takeProfit1
            ) {
              tp1Hit =
                true;

              // Lock TP1 profit
              stopLoss =
                signal.takeProfit1;
            }

            if (
              candle.low <=
              stopLoss
            ) {
              result =
                tp1Hit
                  ? "TP1_WIN"
                  : "LOSS";

              tradeClosedAt =
                j;

              break;
            }

            if (
              candle.high >=
              signal.takeProfit2
            ) {
              result =
                "TP2_WIN";

              tradeClosedAt =
                j;

              break;
            }
          }

          // SELL
          if (
            signal.signal ===
            "SELL"
          ) {
            if (
              !tp1Hit &&
              candle.low <=
                signal.takeProfit1
            ) {
              tp1Hit =
                true;

              // Lock TP1 profit
              stopLoss =
                signal.takeProfit1;
            }

            if (
              candle.high >=
              stopLoss
            ) {
              result =
                tp1Hit
                  ? "TP1_WIN"
                  : "LOSS";

              tradeClosedAt =
                j;

              break;
            }

            if (
              candle.low <=
              signal.takeProfit2
            ) {
              result =
                "TP2_WIN";

              tradeClosedAt =
                j;

              break;
            }
          }
        }

        if (
          result ===
          "TP1_WIN"
        ) {
          tp1Wins++;
        }

        if (
          result ===
          "TP2_WIN"
        ) {
          tp2Wins++;
        }

        if (
          result ===
          "LOSS"
        ) {
          losses++;
        }

        tradeLogs.push({
          result,
          tp1Hit,

          signal:
            signal.signal,

          score:
            signal.score,

          trend:
            signal.structure
              ?.trend,

          liquidity:
            signal.liquidity
              ?.detected,

          liquidityType:
            signal.liquidity
              ?.type,

          volumeRatio:
            signal.volume
              ?.ratio,

          entry:
            signal.entry,

          stopLoss:
            signal.stopLoss,

          takeProfit1:
            signal.takeProfit1,

          takeProfit2:
            signal.takeProfit2,

          openTime:
            candles[i]
              ?.openTime,

          closeTime:
            candles[
              tradeClosedAt
            ]?.openTime,
        });

        i =
          tradeClosedAt + 1;
      }

      const total =
        tp1Wins +
        tp2Wins +
        losses;

      const winRate =
        total > 0
          ? (
              ((tp1Wins +
                tp2Wins) /
                total) *
              100
            ).toFixed(2)
          : 0;

      // R-Multiple Profit
      const totalR =
        tp1Wins * 1 +
        tp2Wins * 2 -
        losses * 1;

      res.json({
        trades:
          total,

        tp1Wins,

        tp2Wins,

        losses,

        winRate,

        totalR,

        tradeLogs,
      });
    } catch (error) {
      console.error(
        error
      );

      res.status(500).json({
        message:
          error.message,
      });
    }
  };