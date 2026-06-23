const fs = require("fs");
const path = require("path");

const folders = [
  "src/config",
  "src/models",
  "src/controllers",
  "src/routes",
  "src/jobs",
  "src/utils",

  "src/services",
  "src/services/mexc",
  "src/services/analysis",
  "src/services/alerts",
  "src/services/backtest",
];

const files = [
  "src/server.js",
  "src/app.js",

  "src/config/db.js",
  "src/config/mexc.js",
  "src/config/socket.js",

  "src/models/Candle15m.js",
  "src/models/Candle1h.js",
  "src/models/Candle4h.js",
  "src/models/Signal.js",
  "src/models/Trade.js",
  "src/models/Backtest.js",

  "src/controllers/candleController.js",
  "src/controllers/signalController.js",
  "src/controllers/tradeController.js",
  "src/controllers/backtestController.js",

  "src/routes/candleRoutes.js",
  "src/routes/signalRoutes.js",
  "src/routes/tradeRoutes.js",
  "src/routes/backtestRoutes.js",

  "src/jobs/candleCollectorJob.js",
  "src/jobs/signalScannerJob.js",
  "src/jobs/backtestJob.js",

  "src/utils/logger.js",
  "src/utils/time.js",
  "src/utils/calculations.js",

  "src/services/mexc/fetchCandles.js",
  "src/services/mexc/websocket.js",
  "src/services/mexc/syncHistorical.js",

  "src/services/analysis/marketStructure.js",
  "src/services/analysis/liquidityGrab.js",
  "src/services/analysis/volumeAnalysis.js",
  "src/services/analysis/sessionFilter.js",
  "src/services/analysis/riskReward.js",
  "src/services/analysis/newsFilter.js",
  "src/services/analysis/confidenceScore.js",
  "src/services/analysis/signalEngine.js",

  "src/services/alerts/telegram.js",
  "src/services/alerts/browserNotification.js",
  "src/services/alerts/soundAlert.js",

  "src/services/backtest/runner.js",
  "src/services/backtest/metrics.js",
  "src/services/backtest/reportGenerator.js",

  ".env",
];

console.log("Creating folders...");

folders.forEach((folder) => {
  fs.mkdirSync(path.join(__dirname, folder), {
    recursive: true,
  });
});

console.log("Creating files...");

files.forEach((file) => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }
});

console.log("✅ BTC Trading Bot structure created successfully!");