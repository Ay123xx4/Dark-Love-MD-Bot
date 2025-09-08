import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import cors from "cors";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json()); // Make sure body parsing works

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verificationCode: { type: String },
});

const User = mongoose.model("User", userSchema);

// Root Route (Fix for "Cannot GET /")
app.get("/", (req, res) => {
  res.send("🚀 Dark-Love-MD Backend Running Successfully!");
});

// Signup Route
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verificationCode,
    });

    await newUser.save();

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your account",
      text: `Your verification code is: ${verificationCode}`,
    });

    res.json({ success: true, message: "Signup successful! Check your email for the verification code." });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ success: false, message: "Server error during signup" });
  }
});

// Verify Route
app.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    if (user.verificationCode === code) {
      user.verified = true;
      user.verificationCode = null;
      await user.save();
      return res.json({ success: true, message: "Email verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }
  } catch (error) {
    console.error("❌ Verify Error:", error);
    res.status(500).json({ success: false, message: "Server error during verification" });
  }
});

// Login Route (Fix for "Server Error")
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: "Invalid credentials" });

    if (!user.verified) {
      return res.status(403).json({ success: false, message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({ success: true, message: "Login successful", user: { username: user.username, email: user.email } });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
