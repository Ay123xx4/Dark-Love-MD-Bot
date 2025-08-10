// server.js
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "./models/User.js";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "devsecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
  })
);

// Connect DB
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connect error:", err.message);
    process.exit(1);
  }
})();

// Nodemailer transporter (use Gmail app password or SMTP service)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ----- Routes -----
// Serve login page on root
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Signup (frontend posts JSON)
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).send("Missing fields");

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).send("User or email already exists");

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(20).toString("hex");

    const user = await User.create({
      username,
      email,
      password: hashed,
      verified: false,
      verificationToken
    });

    const verifyUrl = `${req.protocol}://${req.get("host")}/verify/${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your Dark-Love-MD account",
      html: `<p>Hello ${username},</p>
             <p>Click to verify your email:</p>
             <a href="${verifyUrl}">${verifyUrl}</a>
             <p>If you didn't sign up, ignore this email.</p>`
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).send("ok:check-email");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});

// Email verification
app.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) return res.sendFile(path.join(__dirname, "public", "verify-failed.html"));

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();
    return res.sendFile(path.join(__dirname, "public", "verify-success.html"));
  } catch (err) {
    console.error(err);
    return res.sendFile(path.join(__dirname, "public", "verify-failed.html"));
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) return res.status(400).send("Missing fields");

    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });

    if (!user) return res.status(401).send("Username or password is incorrect");
    if (!user.verified) return res.status(401).send("Please verify your email before logging in");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).send("Username or password is incorrect");

    // Save session
    req.session.userId = user._id;
    req.session.username = user.username;
    return res.status(200).send("ok:logged-in");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});

// Logout
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Protected dashboard page
app.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// API to get session user info
app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  return res.json({ loggedIn: true, username: req.session.username });
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));
