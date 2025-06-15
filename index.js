require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

// 📌 Telegram токен
const token = "7928189423:AAFBsIzl18s2Niblp1BhMtptCDonMhFgAeg";
const bot = new TelegramBot(token, { polling: true });

// 📌 MongoDB
const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

let collection; // глобальна змінна для доступу до колекції

// 🔌 Підключення до MongoDB
async function connectToMongo() {
  try {
    await client.connect();
    const db = client.db("fitness"); // база
    collection = db.collection("results"); // колекція
    console.log("✅ Підключено до MongoDB");

    // (Опціонально) тестовий підрахунок
    const count = await collection.countDocuments();
    console.log(`📦 В базі результатів: ${count} документів`);
  } catch (err) {
    console.error("❌ MongoDB підключення провалено", err);
  }
}
connectToMongo();

// ▶️ Старт командою /start
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

// 📩 Прийом результатів з WebApp
bot.on("web_app_data", async (msg) => {
  console.log("📩 Отримано web_app_data:", msg.web_app_data.data);
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || `id${userId}`;

  try {
    const data = JSON.parse(msg.web_app_data.data); // { exercise, reps }

    if (!data.exercise || !Array.isArray(data.reps)) {
      throw new Error("Невірний формат даних");
    }

    const entry = {
      userId,
      username,
      exercise: data.exercise,
      reps: data.reps,
      date: new Date().toISOString()
    };

    await collection.insertOne(entry);
    console.log(`📝 Збережено в MongoDB:`, entry);
    bot.sendMessage(chatId, `✅ Результат для ${entry.exercise} збережено!`);
  } catch (e) {
    console.error("❌ Помилка при обробці WebApp-даних:", e);
    bot.sendMessage(chatId, "⚠️ Помилка при збереженні результату.");
  }
});

// 🏆 API таблиці лідерів
app.get("/api/scoreboard", async (req, res) => {
  try {
    const allResults = await collection.find({}).toArray();

    const summary = {};
    for (const r of allResults) {
      const uid = r.userId;
      if (!summary[uid]) {
        summary[uid] = {
          name: "@" + r.username,
          pushups: 0,
          squats: 0
        };
      }

      const total = Array.isArray(r.reps) ? r.reps.reduce((a, b) => a + b, 0) : 0;
      if (r.exercise === "pushups") summary[uid].pushups += total;
      if (r.exercise === "squats") summary[uid].squats += total;
    }

    res.json(Object.values(summary));
  } catch (e) {
    console.error("❌ Помилка при формуванні scoreboard:", e);
    res.status(500).json({ error: "DB error" });
  }
});

// 🚀 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server запущено на порту ${PORT}`);
});
