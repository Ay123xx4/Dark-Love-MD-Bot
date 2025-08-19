import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Bot from "../models/Bot.js";
import { isValidURL, isDataURL } from "../utils/validators.js";

const router = express.Router();

// Get all bots (public)
router.get("/", async (_req, res) => {
  const bots = await Bot.find({}).sort({ createdAt: -1 }).lean();
  res.json(bots);
});

// Create bot (requires: name, url, logo(base64), owner username; description optional)
router.post("/", async (req, res) => {
  try {
    const { name, url, logo, description, owner } = req.body;

    if (!name || !url || !logo || !owner)
      return res.status(400).json({ error: "Missing required fields" });

    if (!isValidURL(url))
      return res.status(400).json({ error: "Invalid URL" });

    if (!isDataURL(logo, 800)) // allow up to ~800KB
      return res.status(400).json({ error: "Logo must be a base64 image (png/jpg/webp), max ~800KB" });

    const user = await User.findOne({ username: owner });
    if (!user) return res.status(400).json({ error: "Owner not found" });
    if (!user.verified) return res.status(401).json({ error: "Owner email not verified" });

    const bot = await Bot.create({ name, url, logo, description, owner });
    res.json({ message: "Bot created", bot });
  } catch (err) {
    console.error("Create bot error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete bot (owner password required or OWNER_USERNAME override)
router.delete("/:id", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Missing username or password" });

    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: "Bot not found" });

    // Owner or platform owner
    const isPlatformOwner = username === (process.env.OWNER_USERNAME || "");
    const botOwnerMatch = username === bot.owner;

    if (!isPlatformOwner && !botOwnerMatch)
      return res.status(403).json({ error: "Not authorized to delete this bot" });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Username or password is incorrect" });

    await bot.deleteOne();
    res.json({ message: "Bot deleted" });
  } catch (err) {
    console.error("Delete bot error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
