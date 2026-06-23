import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.use(express.json());


import candleRoutes from "./routes/candleRoutes.js";

app.use(
  "/api/candles",
  candleRoutes
);


import signalRoutes from "./routes/signalRoutes.js";

app.use("/api/signals", signalRoutes);


import tradeRoutes from "./routes/tradeRoutes.js";
app.use(
  "/api/trades",
  tradeRoutes
);

import statsRoutes from "./routes/statsRoutes.js";
app.use(
  "/api/stats",
  statsRoutes
);


import backtestRoutes from "./routes/backtestRoutes.js";
app.use(
  "/api/backtest",
  backtestRoutes
);

export default app;