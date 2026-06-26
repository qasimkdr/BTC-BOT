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
          console.error(error);
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
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        Loading...
      </div>
    );
  }

  const buyDominant =
    pressure.buyPressure >=
    pressure.sellPressure;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl shadow-2xl p-6">

      {/* Glow */}

      <div className="absolute -top-10 -left-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />

      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />

      <h2 className="text-2xl font-bold text-center mb-8">
        Market Pressure
      </h2>

      {/* BUY */}

      <div className="mb-8">

        <div className="flex justify-between mb-2">

          <span className="text-green-400 font-bold">
            BUY
          </span>

          <span className="text-green-300 font-bold text-lg">
            {pressure.buyPressure}%
          </span>

        </div>

        <div className="h-5 bg-zinc-800 rounded-full overflow-hidden">

          <div
            className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_20px_#22c55e] transition-all duration-700 ease-in-out"
            style={{
              width: `${pressure.buyPressure}%`,
            }}
          />

        </div>

      </div>

      {/* SELL */}

      <div>

        <div className="flex justify-between mb-2">

          <span className="text-red-400 font-bold">
            SELL
          </span>

          <span className="text-red-300 font-bold text-lg">
            {pressure.sellPressure}%
          </span>

        </div>

        <div className="h-5 bg-zinc-800 rounded-full overflow-hidden">

          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_20px_#ef4444] transition-all duration-700 ease-in-out"
            style={{
              width: `${pressure.sellPressure}%`,
            }}
          />

        </div>

      </div>

      {/* Divider */}

      <div className="my-8 border-t border-zinc-800" />

      {/* Bias */}

      <div className="flex justify-center">

        <div
          className={`px-6 py-3 rounded-full font-bold tracking-wider transition-all duration-500 ${
            buyDominant
              ? "bg-green-500/20 text-green-300 border border-green-500 shadow-[0_0_25px_#22c55e]"
              : "bg-red-500/20 text-red-300 border border-red-500 shadow-[0_0_25px_#ef4444]"
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