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
         );
          }
        );
      }
    );

    return io;
  };

export const getIO =
  () => io;