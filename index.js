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
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!token || !WEBHOOK_URL) {
  console.error("❌ Не вказано TELEGRAM_BOT_TOKEN або WEBHOOK_URL у .env");
  process.exit(1);
}

// 📡 Telegram Webhook (без polling)
const bot = new TelegramBot(token);
bot.setWebHook(`${WEBHOOK_URL}/bot${token}`);

// 🔄 Обробка запитів від Telegram
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 🔗 Підключення до MongoDB
const mongoUri = process.env.MONGODB_URI;
console.log("🧪 MONGO_URI:", mongoUri);

const client = new MongoClient(mongoUri, {
  tls: true,
  tlsAllowInvalidCertificates: false
});

let collection;

async function connectToMongo() {
  try {
    await client.connect();
    // Використовуємо ім'я БД з URI, якщо воно вказане
    const url = new URL(mongoUri);
    const dbName = url.pathname.replace(/^\//, '') || 'fitness';
    const db = client.db(dbName);
    collection = db.collection("results");
    console.log(`✅ Підключено до MongoDB (БД: ${dbName})`);
  } catch (err) {
    console.error("❌ MongoDB підключення провалено", err);
    process.exit(1);
  }
}

connectToMongo();

// ▶️ Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Привіт! Готовий до тренування? 💪", {
    reply_markup: {
      keyboard: [
        [
          { text: "🚀 Старт", web_app: { url: process.env.WEBAPP_URL } }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});


// 📩 Обробка результатів з WebApp
bot.on("web_app_data", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name || `user${userId}`;
  const rawData = msg.web_app_data?.data;

  console.log("📩 Вхідні дані з WebApp:");
  console.log({ chatId, userId, username, rawData });

  try {
    const data = JSON.parse(rawData);

    const entry = {
      userId,
      username,
      exercise: data.exercise,
      reps: data.reps,
      date: new Date().toISOString()
    };

    console.log("➡️ Запис у Mongo:", entry);

    await collection.insertOne(entry);
    console.log("📝 Збережено:", entry);
    bot.sendMessage(chatId, `✅ Результат для ${entry.exercise} збережено!`);
  } catch (err) {
    console.error("❌ Помилка при обробці:", err);
    bot.sendMessage(chatId, "⚠️ Помилка при збереженні результату.");
  }
});

// 🏆 Таблиця лідерів
app.get("/api/scoreboard", async (req, res) => {
  try {
    const all = await collection.find({}).toArray();
    const pushups = {}, squats = {};

    for (const r of all) {
      const name = "@" + (r.username || `user${r.userId}`);
      const total = Array.isArray(r.reps) ? r.reps.reduce((a, b) => a + b, 0) : 0;

      if (r.exercise === "pushups") pushups[name] = (pushups[name] || 0) + total;
      if (r.exercise === "squats") squats[name] = (squats[name] || 0) + total;
    }

    const toSortedArray = obj =>
      Object.entries(obj).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

    res.json({
      pushups: toSortedArray(pushups),
      squats: toSortedArray(squats)
    });
  } catch (err) {
    console.error("❌ Помилка /api/scoreboard:", err);
    res.status(500).json({ error: "DB error" });
  }
});

// 🚀 Запуск сервера
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Сервер Fitness Quest запущено 🚀");
});


app.listen(PORT, () => {
  console.log(`🌍 Сервер працює на порту ${PORT}`);
});
