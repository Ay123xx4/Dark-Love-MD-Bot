import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import nodemailer from "nodemailer";

const router = express.Router();

// 🔹 Email Sender
const sendVerificationEmail = (user, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify.html?token=${token}`;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const mailOptions = {
    from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Welcome to Dark-Love-MD – Verify Your Email",
    html: `
      <div style="font-family: Arial; background: #f9fafb; padding: 30px; border-radius: 8px;">
        <h2 style="color:#333;">Welcome to Dark-Love-MD</h2>
        <p>This is where you can see all bot repos and deploy them easily.</p>
        <p>Click the button below to verify your email:</p>
        <a href="${verifyUrl}" 
           style="background: #0077ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
           Verify Email
        </a>
        <p style="margin-top:15px; color:#666;">This link expires in 15 minutes.</p>
        <hr/>
        <p style="text-align:center; color:#888;">©2025 Dark-Love-MD Bot Platform</p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error("❌ Email error:", err);
    else console.log("📧 Verification email sent:", info.response);
  });
};

// 🔹 Signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const user = await User.create({ username, email, password });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    sendVerificationEmail(user, token);

    res.json({ message: "Signup successful! Please check your email to verify." });
  } catch (err) {
    res.status(500).json({ message: "Error signing up", error: err.message });
  }
});

// 🔹 Verify Email
router.get("/verify/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ message: "Invalid token" });

    user.isVerified = true;
    await user.save();
    res.json({ message: "Email verified successfully!" });
  } catch {
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// 🔹 Resend Verification Email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    sendVerificationEmail(user, token);

    res.json({ message: "Verification email resent! Please check your inbox." });
  } catch (err) {
    res.status(500).json({ message: "Error resending email", error: err.message });
  }
});

// 🔹 Reset Email (before verification)
router.post("/reset-email", async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;
    const user = await User.findOne({ email: oldEmail });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Cannot reset email after verification" });

    user.email = newEmail;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    sendVerificationEmail(user, token);

    res.json({ message: "Email updated. Verification sent to new email." });
  } catch (err) {
    res.status(500).json({ message: "Error resetting email", error: err.message });
  }
});

// 🔹 Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: "User not found" });

  if (!user.isVerified) return res.status(403).json({ message: "Please verify your email first" });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

export default router;
