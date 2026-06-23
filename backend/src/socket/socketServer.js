import { Server } from "socket.io";

let io = null;

export const initializeSocket =
  (server) => {
    io = new Server(server, {
      cors: {
        origin: "*",
      },
    });

    io.on(
      "connection",
      (socket) => {
        console.log(
          "Client Connected:",
          socket.id
        );

        socket.emit(
          "connected",
          {
            success: true,
          }
        );

        socket.on(
          "disconnect",
          () => {
            console.log(
              "Client Disconnected:",
              socket.id
            );
          }
        );
      }
    );

    return io;
  };

export const getIO =
  () => io;