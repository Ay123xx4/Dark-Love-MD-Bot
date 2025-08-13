import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import multer from "multer";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static public folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connect error:", err));

// Multer config for logo upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Models
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false },
  verificationToken: String,
});
const User = mongoose.model("User", userSchema);

const botSchema = new mongoose.Schema({
  name: String,
  repoLink: String,
  logoUrl: String,
  uploadedBy: String,
});
const Bot = mongoose.model("Bot", botSchema);

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Signup route
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1d" });
  const user = new User({ username, email, password: hashed, verificationToken: token });
  await user.save();

  const verifyUrl = `http://localhost:${process.env.PORT}/verify/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email",
    html: `<h2>Click below to verify your email:</h2><a href="${verifyUrl}">${verifyUrl}</a>`,
  });

  res.json({ success: true, message: "Signup successful! Check your email to verify your account." });
});

// Verify email
app.get("/verify/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.send("Invalid verification link");
    user.verified = true;
    user.verificationToken = null;
    await user.save();
    res.send("✅ Email verified! You can now log in.");
  } catch {
    res.send("❌ Verification link expired or invalid");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.json({ success: false, message: "Username or password is incorrect" });
  if (!user.verified) return res.json({ success: false, message: "Please verify your email first" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: "Username or password is incorrect" });

  res.json({ success: true, username: user.username });
});

// Upload bot
app.post("/upload", upload.single("logo"), async (req, res) => {
  const { name, repoLink, username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.json({ success: false, message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: "Incorrect password" });

  const bot = new Bot({
    name,
    repoLink,
    logoUrl: `/uploads/${req.file.filename}`,
    uploadedBy: username,
  });
  await bot.save();
  res.json({ success: true, message: "Bot uploaded successfully" });
});

// Get all bots
app.get("/bots", async (req, res) => {
  const bots = await Bot.find();
  res.json(bots);
});

// Delete bot
app.post("/delete", async (req, res) => {
  const { botId, username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.json({ success: false, message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: "Incorrect password" });

  await Bot.findByIdAndDelete(botId);
  res.json({ success: true, message: "Bot deleted successfully" });
});

app.listen(process.env.PORT, () => {
  console.log(`🟢 Server running on port ${process.env.PORT}`);
});
