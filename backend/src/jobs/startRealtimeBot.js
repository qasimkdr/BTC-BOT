import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";

import startMexcWebSocket from "../services/mexc/websocket.js";

const start = async () => {
  await connectDB();

  console.log(
    "🚀 Real-Time Trading Bot Started"
  );

  startMexcWebSocket();
};

start();