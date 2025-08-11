// Get all bots (public)
app.get('/public-bots', async (req, res) => {
  try {
    const bots = await Bot.find({}); // Bot is your Mongoose model
    res.json(bots);
  } catch (error) {
    console.error("Error fetching bots:", error);
    res.status(500).json({ error: "Server error" });
  }
});
