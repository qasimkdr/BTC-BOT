import dotenv from "dotenv";

dotenv.config();

import sendTelegramAlert from "../services/alerts/telegram.js";

const run = async () => {
  try {
    await sendTelegramAlert({
      signal: "BUY",
      score: 95,
      entry: 106500,
      stopLoss: 106000,
      takeProfit1: 107500,
      takeProfit2: 108500,
    });

    console.log(
      "Telegram test completed"
    );

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

run();