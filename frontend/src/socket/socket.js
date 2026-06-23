import { io } from "socket.io-client";

const socket = io(
  "https://btc-bot-lqzr.onrender.com/"
);

export default socket;
