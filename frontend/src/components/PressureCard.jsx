import { useEffect, useState } from "react";
import api from "../services/api";

const PressureCard = () => {
  const [pressure, setPressure] =
    useState(null);

  useEffect(() => {
    const loadPressure =
      async () => {
        try {
          const res =
            await api.get(
              "/signals/test"
            );

          setPressure(
            res.data
          );
        } catch (error) {
          console.error(
            error
          );
        }
      };

    loadPressure();

    const interval =
      setInterval(
        loadPressure,
        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  if (!pressure) {
    return (
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        Loading...
      </div>
    );
  }

  const buyDominant =
    pressure.buyPressure >
    pressure.sellPressure;

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 shadow-xl">

      <h2 className="text-2xl font-bold mb-6 text-center">
        Market Pressure
      </h2>

      {/* BUY */}

      <div className="mb-6">

        <div className="flex justify-between mb-2">

          <span className="font-semibold text-green-400">
            BUY
          </span>

          <span className="font-bold text-green-300">
            {pressure.buyPressure}%
          </span>

        </div>

        <div className="h-4 rounded-full bg-zinc-800 overflow-hidden">

          <div
            className={`h-full rounded-full transition-all duration-700 ${
              buyDominant
                ? "bg-green-400 shadow-[0_0_20px_#22c55e] animate-pulse"
                : "bg-green-500"
            }`}
            style={{
              width: `${pressure.buyPressure}%`,
            }}
          />

        </div>

      </div>

      {/* SELL */}

      <div>

        <div className="flex justify-between mb-2">

          <span className="font-semibold text-red-400">
            SELL
          </span>

          <span className="font-bold text-red-300">
            {pressure.sellPressure}%
          </span>

        </div>

        <div className="h-4 rounded-full bg-zinc-800 overflow-hidden">

          <div
            className={`h-full rounded-full transition-all duration-700 ${
              !buyDominant
                ? "bg-red-400 shadow-[0_0_20px_#ef4444] animate-pulse"
                : "bg-red-500"
            }`}
            style={{
              width: `${pressure.sellPressure}%`,
            }}
          />

        </div>

      </div>

      <div className="mt-8 flex justify-center">

        <div
          className={`px-5 py-2 rounded-full font-bold tracking-wide ${
            buyDominant
              ? "bg-green-900 text-green-300 border border-green-500 shadow-[0_0_20px_#22c55e]"
              : "bg-red-900 text-red-300 border border-red-500 shadow-[0_0_20px_#ef4444]"
          }`}
        >
          {buyDominant
            ? "🟢 BUY DOMINATING"
            : "🔴 SELL DOMINATING"}
        </div>

      </div>

    </div>
  );
};

export default PressureCard;