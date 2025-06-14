const TelegramBot = require("node-telegram-bot-api");
const token = "AAFBsIzl18s2Niblp1BhMtptCDonMhFgAeg";
const bot = new TelegramBot(token, { polling: true });

// ⏺ Тимчасове сховище (у пам'яті)
const results = {};

// 🔘 Відкриваємо вебдодаток
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Привіт! Готовий до тренування? 💪", {
    reply_markup: {
      inline_keyboard: [[
        { text: "🚀 Старт", web_app: { url: "https://your-fitness-quest-bot.vercel.app/" } }
      ]]
    }
  });
});

// 📩 Прийом даних з WebApp
bot.on("web_app_data", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    const data = JSON.parse(msg.web_app_data.data); // очікуємо { exercise: "pushups", reps: [..] }

    if (!results[userId]) results[userId] = [];
    results[userId].push({
      exercise: data.exercise,
      reps: data.reps,
      date: new Date().toISOString()
    });

    console.log(`📝 Збережено для ${userId}:`, data);
    bot.sendMessage(chatId, `✅ Результат для ${data.exercise} збережено!`);
  } catch (e) {
    console.error("❌ Помилка при обробці даних:", e);
    bot.sendMessage(chatId, "⚠️ Сталася помилка при збереженні результату.");
  }
});
