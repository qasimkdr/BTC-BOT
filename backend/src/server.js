import dotenv from "dotenv";
dotenv.config();

import http from "http";

import app from "./app.js";
import connectDB from "./config/db.js";

import { initializeSocket } from "./socket/socketServer.js";

import startMexcWebSocket from "./services/mexc/websocket.js";


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // MongoDB
    await connectDB();

    



    // Express Server
    const server = http.createServer(app);

    // Socket.io
    initializeSocket(server);

    // Binance WebSocket
    startMexcWebSocket();

    // Start Server
    server.listen(PORT, () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );

      console.log(
        "📡 Socket.io Started"
      );

      console.log(
        "📈 Binance Stream Started"
      );
    });
  } catch (error) {
    console.error(
      "Server Startup Error:"
    );

    console.error(error);

    process.exit(1);
  }
};

startServer();