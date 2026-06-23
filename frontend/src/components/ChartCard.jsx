import {
  createChart,
  CandlestickSeries,
} from "lightweight-charts";

import {
  useEffect,
  useRef,
} from "react";

import api from "../services/api";
import socket from "../services/socket";

const ChartCard = () => {
  const chartRef = useRef(null);

  const seriesRef =
    useRef(null);

  useEffect(() => {
    let chart;

    const loadChart =
      async () => {
        if (
          !chartRef.current
        )
          return;

        chart =
          createChart(
            chartRef.current,
            {
              width:
                chartRef.current
                  .clientWidth,

              height: 500,

              layout: {
                background: {
                  color:
                    "#18181b",
                },

                textColor:
                  "#ffffff",
              },

              grid: {
                vertLines: {
                  color:
                    "#27272a",
                },

                horzLines: {
                  color:
                    "#27272a",
                },
              },
            }
          );

        const candleSeries =
          chart.addSeries(
            CandlestickSeries
          );

        seriesRef.current =
          candleSeries;

        const response =
          await api.get(
            "/candles"
          );

        const chartData =
          response.data.map(
            (
              candle
            ) => ({
              time:
                Math.floor(
                  candle.openTime /
                    1000
                ),

              open:
                candle.open,

              high:
                candle.high,

              low:
                candle.low,

              close:
                candle.close,
            })
          );

        candleSeries.setData(
          chartData
        );

        chart
          .timeScale()
          .fitContent();
      };

    loadChart();

    socket.on(
      "candle-update",
      (candle) => {
        if (
          seriesRef.current
        ) {
          seriesRef.current.update(
            candle
          );
        }
      }
    );

    const handleResize =
      () => {
        if (
          chart &&
          chartRef.current
        ) {
          chart.applyOptions(
            {
              width:
                chartRef
                  .current
                  .clientWidth,
            }
          );
        }
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      socket.off(
        "candle-update"
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      if (chart) {
        chart.remove();
      }
    };
  }, []);

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4">
        BTCUSDT Live Chart
      </h2>

      <div
        ref={chartRef}
        className="w-full"
      />
    </div>
  );
};

export default ChartCard;