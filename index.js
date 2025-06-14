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

    if (!results[username]) results[username] = [];
    results[username].push({
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
  const formatted = Object.entries(results).map(([name, resList]) => {
    const data = {
      name,
      results: [] // потрібна для сумування в scoreboard.html
    };

    // Групуємо по вправі
    const grouped = {
      pushups: [],
      squats: []
    };

    resList.forEach(entry => {
      if (entry.exercise === "pushups") grouped.pushups.push(...entry.reps);
      if (entry.exercise === "squats") grouped.squats.push(...entry.reps);
    });

    if (grouped.pushups.length > 0)
      data.results.push({ exercise: "pushups", reps: grouped.pushups });
    if (grouped.squats.length > 0)
      data.results.push({ exercise: "squats", reps: grouped.squats });

    return data;
  });

  res.json(formatted);
});

// 🚀 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server запущено на порту ${PORT}`);
});
