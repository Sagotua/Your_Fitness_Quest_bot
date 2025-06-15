require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const TelegramBot = require("node-telegram-bot-api");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 Telegram токен
const token = process.env.TELEGRAM_BOT_TOKEN || "YOUR_FALLBACK_BOT_TOKEN";
const bot = new TelegramBot(token, { polling: true });

// 🟢 MongoDB URI
const mongoUri = process.env.MONGODB_URI;
console.log("🧪 MONGO_URI:", mongoUri);
const client = new MongoClient(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsAllowInvalidCertificates: false
});

let collection;

// 🔌 Підключення до MongoDB
async function connectToMongo() {
  try {
    await client.connect();
    const db = client.db("fitness");
    collection = db.collection("results");
    console.log("✅ Підключено до MongoDB");

    const count = await collection.countDocuments();
    console.log(`📦 В базі результатів: ${count} документів`);
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

// 📩 Обробка результатів з WebApp
bot.on("web_app_data", async (msg) => {
  console.log("📩 Отримано web_app_data:", msg.web_app_data);

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
    console.log(`📝 Збережено в MongoDB:`, entry);
    bot.sendMessage(chatId, `✅ Результат для ${entry.exercise} збережено!`);
  } catch (e) {
    console.error("❌ Помилка при збереженні:", e);
    bot.sendMessage(chatId, "⚠️ Помилка при збереженні результату.");
  }
});

// 🏆 Таблиця лідерів (2 топи)
app.get("/api/scoreboard", async (req, res) => {
  try {
    const allResults = await collection.find({}).toArray();

    const pushups = {};
    const squats = {};

    for (const r of allResults) {
      const name = "@" + r.username;
      const total = Array.isArray(r.reps) ? r.reps.reduce((a, b) => a + b, 0) : 0;

      if (r.exercise === "pushups") {
        pushups[name] = (pushups[name] || 0) + total;
      }

      if (r.exercise === "squats") {
        squats[name] = (squats[name] || 0) + total;
      }
    }

    const pushupLeaders = Object.entries(pushups)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const squatLeaders = Object.entries(squats)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    res.json({
      pushups: pushupLeaders,
      squats: squatLeaders
    });
  } catch (e) {
    console.error("❌ Помилка при формуванні /api/scoreboard:", e);
    res.status(500).json({ error: "DB error" });
  }
});

// 🚀 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server запущено на порту ${PORT}`);
});
