const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const router = express.Router();

// Transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Signup route
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already registered" });

    let userNameTaken = await User.findOne({ username });
    if (userNameTaken) return res.status(400).json({ message: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    user = new User({
      username,
      email,
      password: hashedPassword,
      verificationCode
    });

    await user.save();

    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your Dark-Love-MD account",
      text: `Your verification code is ${verificationCode}`
    });

    res.json({ message: "Signup successful, check your email for verification code" });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify route
router.post("/verify", async (req, res) => {
  const { code } = req.body;

  try {
    const user = await User.findOne({ verificationCode: code });
    if (!user) return res.status(400).json({ message: "Invalid verification code" });

    user.isVerified = true;
    user.verificationCode = null;
    await user.save();

    res.json({ message: "Account verified successfully" });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid username or password" });

    if (!user.isVerified) return res.status(400).json({ message: "Please verify your email first" });

    res.json({ message: "Login successful", username: user.username });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
             
