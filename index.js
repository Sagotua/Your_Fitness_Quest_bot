require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

const token = "7928189423:AAFBsIzl18s2Niblp1BhMtptCDonMhFgAeg";
const bot = new TelegramBot(token, { polling: true });

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

    const count = await collection.countDocuments();
    console.log(`📦 В базі результатів: ${count} документів`);
  } catch (err) {
    console.error("❌ MongoDB підключення провалено", err);
  }
}
connectToMongo();

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

bot.on("web_app_data", async (msg) => {
  console.log("📦 Отримано web_app_data:", msg.web_app_data);

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
    console.error("❌ Помилка при обробці WebApp-даних:", e);
    bot.sendMessage(chatId, "⚠️ Помилка при збереженні результату.");
  }
});

// 🏆 API таблиці лідерів (2 окремі топи)
app.get("/api/scoreboard", async (req, res) => {
  try {
    const allResults = await collection.find({}).toArray();

    const pushups = {};
    const squats = {};

    for (const r of allResults) {
      const name = "@" + r.username;
      const total = Array.isArray(r.reps) ? r.reps.reduce((a, b) => a + b, 0) : 0;

      if (r.exercise === "pushups") {
        if (!pushups[name]) pushups[name] = 0;
        pushups[name] += total;
      }

      if (r.exercise === "squats") {
        if (!squats[name]) squats[name] = 0;
        squats[name] += total;
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
    console.error("❌ Помилка при формуванні scoreboard:", e);
    res.status(500).json({ error: "DB error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server запущено на порту ${PORT}`);
});
