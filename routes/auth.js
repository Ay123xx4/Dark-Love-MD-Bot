import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { verificationEmailHTML } from "../utils/emailTemplates.js";

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

// Mailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
});

// Helper: issue 15-min verification token
function issueVerifyToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    const token = issueVerifyToken(user._id);
    const verifyLink = `${BACKEND_BASE_URL}/api/auth/verify/${token}`;

    await transporter.sendMail({
      from: `"Dark-Love-MD" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Welcome to Dark-Love-MD - Verify Your Email",
      html: verificationEmailHTML({ verifyLink })
    });

    res.json({ message: "Signup successful! Verification email sent." });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify email
router.get("/verify/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).send("Invalid token");

    if (!user.verified) {
      user.verified = true;
      await user.save();
    }
    return res.redirect(`${FRONTEND_URL}/verify-success.html`);
  } catch (err) {
    return res.status(400).send("Token expired or invalid");
  }
});

// Resend verification
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const u = await User.findOne({ email });
    if (!u) return res.status(404).json({ message: "User not found" });
    if (u.verified) return res.json({ message: "Already verified" });

    const token = issueVerifyToken(u._id);
    const verifyLink = `${BACKEND_BASE_URL}/api/auth/verify/${token}`;

    await transporter.sendMail({
      from: `"Dark-Love-MD" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Resend Verification - Dark-Love-MD",
      html: verificationEmailHTML({ verifyLink })
    });

    res.json({ message: "Verification email resent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset email (change account email -> new verification required)
router.post("/reset-email", async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;
    const u = await User.findOne({ email: oldEmail });
    if (!u) return res.status(404).json({ message: "Old email not found" });

    u.email = newEmail;
    u.verified = false;
    await u.save();

    const token = issueVerifyToken(u._id);
    const verifyLink = `${BACKEND_BASE_URL}/api/auth/verify/${token}`;

    await transporter.sendMail({
      from: `"Dark-Love-MD" <${process.env.GMAIL_USER}>`,
      to: newEmail,
      subject: "Verify Your New Email - Dark-Love-MD",
      html: verificationEmailHTML({ verifyLink })
    });

    res.json({ message: "Email updated. Verification sent to new email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login (username OR email + password)
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if ((!username && !email) || !password)
      return res.status(400).json({ message: "Missing credentials" });

    const user = await User.findOne(
      username ? { username } : { email }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Username or password is incorrect" });

    if (!user.verified) return res.status(401).json({ message: "Email not verified" });

    const safeUser = { id: user._id, username: user.username, email: user.email };
    res.json({ message: "Login successful", user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
