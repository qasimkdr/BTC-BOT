import {
  useEffect,
  useState,
} from "react";

import socket from "../services/socket";

const PriceCard = () => {
  const [price, setPrice] =
    useState(0);

  useEffect(() => {

    const handleConnect =
      () => {
        console.log(
          "✅ Socket Connected:",
          socket.id
        );
      };

    const handleDisconnect =
      () => {
        console.log(
          "❌ Socket Disconnected"
        );
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

      <h2 className="text-xl font-semibold">
        BTCUSDT Price
      </h2>

      <p className="text-4xl font-bold mt-4 text-green-400">
        ${price}
      </p>

    </div>
  );
};

export default PriceCard;
