export default function handler(req, res) {
  // Тимчасові дані (можна буде під'єднати до БД або globalThis)
  const results = {
    "@nazar": {
      username: "@nazar",
      data: [
        { exercise: "pushups", reps: [12, 14, 10, 20, 16] },
        { exercise: "squats", reps: [10, 15, 12, 14, 14] }
      ]
    },
    "@maxpush": {
      username: "@maxpush",
      data: [
        { exercise: "pushups", reps: [15, 12, 10, 11, 12] },
        { exercise: "squats", reps: [15, 14, 14, 12, 13] }
      ]
    }
  };

  const formatted = Object.values(results).map((user) => {
    const data = {
      name: user.username,
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

  res.status(200).json(formatted);
}
