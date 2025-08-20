import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendVerificationEmail } from "../utils/sendVerificationEmail.js";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    await sendVerificationEmail(email, token);

    res.json({ message: "Signup successful! Check your email for verification." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Verify Email
router.get("/verify/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);

    await User.findByIdAndUpdate(decoded.id, { verified: true });

    res.json({ message: "Email verified successfully!" });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// Login (username + password)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.verified) return res.status(403).json({ message: "Please verify your email first" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful!", token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
