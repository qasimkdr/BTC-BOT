import TelegramBot from "node-telegram-bot-api";

const sendTelegramAlert = async (
  signal,
  alertType = "SIGNAL",
  remainingSeconds = null
) => {
  try {
    const token =
      process.env.TELEGRAM_BOT_TOKEN;

    const chatIds = [
      process.env.TELEGRAM_CHAT_ID,
      // process.env.TELEGRAM_CHAT_ID_2,
    ].filter(Boolean);

    if (!token) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN missing"
      );
    }

    if (chatIds.length === 0) {
      throw new Error(
        "No TELEGRAM_CHAT_ID configured"
      );
    }

    const bot =
      new TelegramBot(
        token,
        {
          polling: false,
        }
      );

    let title =
      "🚨 BTC SIGNAL";

    if (
      alertType ===
      "2MIN"
    ) {
      title =
        "🔔 PRE ALERT (2 MIN)";
    }

    if (
      alertType ===
      "1MIN"
    ) {
      title =
        "⚡ CONFIRMATION (1 MIN)";
    }

    if (
      alertType ===
      "15SEC"
    ) {
      title =
        "🚨 FINAL ALERT (15 SEC)";
    }

    const message = `
🤖 BTC AI SIGNAL BOT

━━━━━━━━━━━━━━━━━

${title}

📈 Pair:
BTCUSDT

🎯 Signal:
${signal.signal}

⭐ Confidence:
${signal.score}%

🟢 Buy Pressure:
${signal.buyPressure}%

🔴 Sell Pressure:
${signal.sellPressure}%

━━━━━━━━━━━━━━━━━

💰 Current Price:
${signal.currentPrice ?? "N/A"}

🎯 Entry:
${signal.entry ?? "Waiting..."}

🛑 Stop Loss:
${signal.stopLoss ?? "-"}

🥇 Take Profit 1:
${signal.takeProfit1 ?? "-"}

🥈 Take Profit 2:
${signal.takeProfit2 ?? "-"}

━━━━━━━━━━━━━━━━━

📊 Trend:
${signal.structure?.trend ?? "N/A"}

📈 EMA:
${
  signal.reasons
    ?.bullishEMA ||
  signal.reasons
    ?.bearishEMA
    ? "✅"
    : "❌"
}

📦 Volume Spike:
${
  signal.volume
    ?.volumeSpike
    ? "✅"
    : "❌"
}

💧 Liquidity:
${
  signal.liquidity
    ?.detected
    ? "✅"
    : "❌"
}

🕒 Trading Session:
${
  signal.session
    ?.validTradingTime
    ? "✅ Active"
    : "❌ Closed"
}

━━━━━━━━━━━━━━━━━

⏳ Time Remaining:
${remainingSeconds ?? "N/A"} sec

⚠️ This is an AI-generated trading signal.
Always manage your risk.
`;

    for (const chatId of chatIds) {
      try {
        const response =
          await bot.sendMessage(
            chatId,
            message
          );

        console.log(
          `✅ Telegram ${alertType} sent to ${chatId}`,
          response.message_id
        );
      } catch (error) {
        console.error(
          `❌ Failed to send to ${chatId}`
        );

        console.error(
          error.message
        );
      }
    }

    return true;
  } catch (error) {
    console.error(
      "Telegram Error:"
    );

    console.error(
      error.message
    );

    return null;
  }
};

export default sendTelegramAlert;