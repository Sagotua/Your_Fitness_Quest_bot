const TelegramBot = require("node-telegram-bot-api");

// 🔐 Твій токен бота
const token = "7928189423:AAFBsIzl18s2Niblp1BhMtptCDonMhFgAeg";

// 🚀 URL на майбутній вебдодаток (тимчасово можемо поставити Google)
const webAppUrl = "https://your-fitness-quest-bot.vercel.app/"; // ← заміниш, коли буде готовий додаток

const bot = new TelegramBot(token, { polling: true });

// Відповідь на /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Привіт! Готовий до тренування? 💪 Натисни кнопку нижче:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Старт",
            web_app: { url: "https://your-fitness-quest-bot.vercel.app/" }
          }
        ]
      ]
    }
  });
});
