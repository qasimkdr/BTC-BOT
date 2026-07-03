import {
  useEffect,
  useState,
} from "react";

import api from "../services/api";
import socket from "../services/socket";

const PriceCard = () => {

  const [price, setPrice] =
    useState(null);

  const [connected, setConnected] =
    useState(false);

  useEffect(() => {

    const loadPrice =
      async () => {
        try {

          const res =
            await api.get(
              "/signals/test"
            );

          setPrice(
            res.data.currentPrice
          );

        } catch (error) {
          console.error(error);
        }
      };

    loadPrice();

    const handleConnect =
      () => {

        console.log(
          "✅ Socket Connected:",
          socket.id
        );

        setConnected(true);

      };

    const handleDisconnect =
      () => {

        console.log(
          "❌ Socket Disconnected"
        );

        setConnected(false);

      };

    const handlePrice =
      (data) => {

        console.log(
          "📈 Price Update:",
          data
        );

        setPrice(
          data.price
        );

      };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "price-update",
      handlePrice
    );

    return () => {

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "price-update",
        handlePrice
      );

    };

  }, []);

  return (
    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">

      <div className="flex justify-between items-center">

        <h2 className="text-xl font-semibold">
          BTCUSDT Price
        </h2>

        <span
          className={`text-sm ${
            connected
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {connected
            ? "🟢 Live"
            : "🔴 Offline"}
        </span>

      </div>

      <p className="text-4xl font-bold mt-4 text-green-400">
        {price
          ? `$${price}`
          : "Loading..."}
      </p>

    </div>
  );
};

export default PriceCard;
