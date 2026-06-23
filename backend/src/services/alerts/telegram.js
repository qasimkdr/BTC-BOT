import TelegramBot from "node-telegram-bot-api";

const sendTelegramAlert = async (
  signal,
  alertType = "SIGNAL",
  remainingSeconds = null
) => {
  try {
    const token =
      process.env.TELEGRAM_BOT_TOKEN;

    const chatId =
      process.env.TELEGRAM_CHAT_ID;

    if (!token) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN missing"
      );
    }

    if (!chatId) {
      throw new Error(
        "TELEGRAM_CHAT_ID missing"
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
${title}

Pair:
BTCUSDT

Signal:
${signal.signal}

Score:
${signal.score}

Current Price:
${signal.currentPrice ?? "N/A"}

Entry:
${signal.entry}

SL:
${signal.stopLoss}

TP1:
${signal.takeProfit1}

TP2:
${signal.takeProfit2}

Trend:
${signal.structure?.trend ?? "N/A"}

EMA:
${
  signal.reasons
    ?.bullishEMA ||
  signal.reasons
    ?.bearishEMA
    ? "✅"
    : "❌"
}

Volume:
${
  signal.volume
    ?.volumeSpike
    ? "✅"
    : "❌"
}

Liquidity:
${
  signal.liquidity
    ?.detected
    ? "✅"
    : "❌"
}

Session:
${
  signal.session
    ?.validTradingTime
    ? "✅"
    : "❌"
}

Time Remaining:
${
  remainingSeconds ??
  "N/A"
} sec
`;

    const response =
      await bot.sendMessage(
        chatId,
        message
      );

    console.log(
      `✅ Telegram ${alertType} Sent`,
      response.message_id
    );

    return response;
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