import { useEffect, useState } from "react";
import socket from "../services/socket";

const PriceCard = () => {
  const [price, setPrice] =
    useState(0);

  useEffect(() => {
  socket.on("connect", () => {
    console.log("SOCKET CONNECTED", socket.id);
  });

  socket.on("price-update", (data) => {
    console.log("PRICE RECEIVED", data);

    setPrice(data.price);
  });

  socket.on("connect_error", (err) => {
    console.log("SOCKET ERROR", err.message);
  });

  return () => {
    socket.off("price-update");
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