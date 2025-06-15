// 🏆 API таблиці лідерів
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
