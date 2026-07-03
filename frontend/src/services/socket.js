import { io } from "socket.io-client";

const socket = io(
  "https://btc-bot-lqzr.onrender.com",
  {
    transports: ["websocket"],
  }
);

socket.on("connect", () => {
  console.log(
    "🟢 Socket Connected:",
    socket.id
  );
});

socket.on(
  "disconnect",
  () => {
    console.log(
      "🔴 Socket Disconnected"
    );
  }
);

export default socket;
