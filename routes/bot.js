import express from "express";
import Bot from "../models/Bot.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// Middleware: verify token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Upload bot
router.post("/upload", authMiddleware, async (req, res) => {
  try {
    const { name, repoUrl, description, logoUrl, password } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });

    const bot = new Bot({
      name,
      repoUrl,
      description,
      logoUrl,
      owner: user.username
    });

    await bot.save();
    res.json({ message: "Bot uploaded successfully", bot });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bot upload failed" });
  }
});

// Get all bots
router.get("/", async (req, res) => {
  try {
    const bots = await Bot.find();
    res.json(bots);
  } catch {
    res.status(500).json({ error: "Error fetching bots" });
  }
});

// Delete bot
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);

    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: "Bot not found" });

    if (bot.owner !== user.username && user.email !== process.env.OWNER_EMAIL) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });

    await Bot.findByIdAndDelete(req.params.id);
    res.json({ message: "Bot deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bot delete failed" });
  }
});

export default router;
