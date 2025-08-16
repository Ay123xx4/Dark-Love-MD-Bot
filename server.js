// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ allow frontend (vercel) to connect
app.use(cors({
  origin: ["https://dark-love-md-github-repo.vercel.app"], // 👈 replace with your Vercel URL
  credentials: true
}));
app.use(express.json());

// ✅ connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error(err));

// ✅ User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  verified: { type: Boolean, default: false }
});
const User = mongoose.model("User", userSchema);

// ✅ Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// ✅ Signup route
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({ username, email, password: hashedPassword });

    // create verification token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const verifyLink = `https://dark-love-md-bot-2.onrender.com/api/auth/verify/${token}`;

    // send styled email
    await transporter.sendMail({
      from: '"Dark-Love-MD" <' + process.env.GMAIL_USER + '>',
      to: email,
      subject: "Welcome to Dark-Love-MD - Verify Your Email",
      html: `
        <div style="background:#f5f5f5;padding:20px;font-family:sans-serif;text-align:center;">
          <h2>Welcome to Dark-Love-MD 🎉</h2>
          <p>This is where you can see all bot repos and visit them for deployment.</p>
          <p>Click below to verify your email:</p>
          <a href="${verifyLink}" 
             style="display:inline-block;margin-top:10px;padding:12px 20px;background:#0077ff;color:white;text-decoration:none;border-radius:6px;">
            Verify Email
          </a>
          <p style="margin-top:30px;color:#555;">©2025 Dark-Love-MD Bot Platform</p>
        </div>`
    });

    res.json({ message: "Signup successful! Verification email sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Verify Email
app.get("/api/auth/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).send("Invalid token");

    user.verified = true;
    await user.save();

    // redirect to frontend "verify-success.html"
    res.redirect("https://dark-love-md-github-repo.vercel.app/verify-success.html");
  } catch (err) {
    res.status(400).send("Token expired or invalid");
  }
});

// ✅ Resend Verification
app.post("/api/auth/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const verifyLink = `https://dark-love-md-bot-2.onrender.com/api/auth/verify/${token}`;

    await transporter.sendMail({
      from: '"Dark-Love-MD" <' + process.env.GMAIL_USER + '>',
      to: email,
      subject: "Resend Verification - Dark-Love-MD",
      html: `<p>Click below to verify your email:</p>
             <a href="${verifyLink}" style="padding:10px 20px;background:#0077ff;color:white;border-radius:6px;text-decoration:none;">Verify Email</a>`
    });

    res.json({ message: "Verification email resent!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Reset Email
app.post("/api/auth/reset-email", async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;
    const user = await User.findOne({ email: oldEmail });
    if (!user) return res.status(404).json({ message: "Old email not found" });

    user.email = newEmail;
    user.verified = false;
    await user.save();

    res.json({ message: "Email reset successful. Please check your new email for verification." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.verified) return res.status(401).json({ message: "Email not verified" });

    res.json({ message: "Login successful", user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
