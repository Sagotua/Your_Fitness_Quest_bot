require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const TelegramBot = require("node-telegram-bot-api");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Telegram токен та Webhook URL
const token = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // наприклад: https://fitness-server-8k9n.onrender.com

// 🔌 Telegram Webhook замість polling
const bot = new TelegramBot(token);
bot.setWebHook(`${WEBHOOK_URL}/bot${token}`);

// 📡 Обробка Telegram запитів
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 🔗 Підключення до MongoDB
const mongoUri = process.env.MONGODB_URI;
console.log("🧪 MONGO_URI:", mongoUri);

const client = new MongoClient(mongoUri);

let collection;
async function connectToMongo() {
  try {
    await client.connect();
    const db = client.db("fitness");
    collection = db.collection("results");
    console.log("✅ Підключено до MongoDB");
  } catch (err) {
    console.error("❌ MongoDB підключення провалено", err);
  }
}
connectToMongo();

// ▶️ Команда /start
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

// 📩 Обробка даних з WebApp
bot.on("web_app_data", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || `id${userId}`;

  try {
    const data = JSON.parse(msg.web_app_data.data);

    const entry = {
      userId,
      username,
      exercise: data.exercise,
      reps: data.reps,
      date: new Date().toISOString()
    };

    await collection.insertOne(entry);
    console.log("📝 Збережено:", entry);
    bot.sendMessage(chatId, `✅ Результат для ${entry.exercise} збережено!`);
  } catch (err) {
    console.error("❌ Помилка при обробці даних:", err);
    bot.sendMessage(chatId, "⚠️ Помилка при збереженні результату.");
  }
});

// 🏆 /api/scoreboard
app.get("/api/scoreboard", async (req, res) => {
  try {
    const all = await collection.find({}).toArray();
    const pushups = {}, squats = {};

    for (const r of all) {
      const name = "@" + r.username;
      const total = Array.isArray(r.reps) ? r.reps.reduce((a, b) => a + b, 0) : 0;

      if (r.exercise === "pushups") pushups[name] = (pushups[name] || 0) + total;
      if (r.exercise === "squats") squats[name] = (squats[name] || 0) + total;
    }

    const toSorted = obj =>
      Object.entries(obj).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

    res.json({ pushups: toSorted(pushups), squats: toSorted(squats) });
  } catch (err) {
    console.error("❌ Scoreboard помилка:", err);
    res.status(500).json({ error: "DB error" });
  }
});

// 🌐 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Сервер запущено на порту ${PORT}`);
});
