const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const app = express();

const token = "AAFBsIzl18s2Niblp1BhMtptCDonMhFgAeg";
const bot = new TelegramBot(token, { polling: true });

// ⏺ Тимчасове сховище (у пам'яті)
const results = {};

app.use(express.json()); // На майбутнє, якщо буде POST

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
  const username = msg.from.username || `id${userId}`;

  try {
    const data = JSON.parse(msg.web_app_data.data); // { exercise: "pushups", reps: [..] }

    if (!results[userId]) {
      results[userId] = {
        username,
        data: []
      };
    }

    results[userId].data.push({
      exercise: data.exercise,
      reps: data.reps,
      date: new Date().toISOString()
    });

    console.log(`📝 Збережено для ${username}:`, data);
    bot.sendMessage(chatId, `✅ Результат для ${data.exercise} збережено!`);
  } catch (e) {
    console.error("❌ Помилка при обробці даних:", e);
    bot.sendMessage(chatId, "⚠️ Сталася помилка при збереженні результату.");
  }
});

// 🌐 API для scoreboard
app.get("/api/scoreboard", (req, res) => {
  const formatted = Object.values(results).map((user) => {
    const data = {
      name: "@" + user.username,
      pushups: 0,
      squats: 0
    };

    user.data.forEach(entry => {
      const total = entry.reps.reduce((a, b) => a + b, 0);
      if (entry.exercise === "pushups") data.pushups += total;
      if (entry.exercise === "squats") data.squats += total;
    });

    return data;
  });

  res.json(formatted);
});

// 🚀 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server запущено на порту ${PORT}`);
});
