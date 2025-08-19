import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

// Signup (with email verification)
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: false
    });
    await user.save();

    // Send verification email
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "15m" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify.html?token=${token}`;

    const mailOptions = {
      from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Dark-Love-MD 🎉",
      html: `
        <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
          <h2>Welcome to Dark-Love-MD 🚀</h2>
          <p>This is where you can see all bot repo and also visit them for deployment.</p>
          <p>Click the button below to verify your email:</p>
          <a href="${verifyUrl}" 
             style="background:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px">
             Verify Email
          </a>
          <br><br>
          <p style="color:gray;font-size:12px">@2025 Dark-Love-MD Bot Platform</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Signup successful, please check your email to verify your account" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Verify email
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(400).json({ error: "Invalid token" });

    user.isVerified = true;
    await user.save();

    res.json({ message: "Email verified successfully" });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.isVerified) return res.status(400).json({ error: "Please verify your email first" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ message: "Login successful", token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
