import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

/* =======================
   MIDDLEWARE
======================= */
app.use(express.json());
app.use(cors({
  origin: "*", // later you can restrict this
  methods: ["GET", "POST"],
  credentials: true
}));

/* =======================
   DEFAULT ROUTE (IMPORTANT)
======================= */
app.get("/", (req, res) => {
  res.send("✅ Dark-Love-MD Backend is Live and Working!");
});

/* =======================
   MONGODB CONNECTION
======================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

/* =======================
   USER SCHEMA
======================= */
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email:    { type: String, unique: true },
  password: String,
  verified: { type: Boolean, default: false },
  verifyCode: String
});

const User = mongoose.model("User", userSchema);

/* =======================
   EMAIL SETUP
======================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =======================
   SIGNUP
======================= */
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (userExists) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verifyCode,
      verified: false
    });

    await newUser.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Dark-Love-MD Verification Code",
      text: `Your verification code is: ${verifyCode}`
    });

    res.json({ message: "Verification code sent" });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   VERIFY EMAIL
======================= */
app.post("/verify", async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findOne({ verifyCode: code });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.verified = true;
    user.verifyCode = "";
    await user.save();

    res.json({ message: "Email verified successfully" });

  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   LOGIN
======================= */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.verified) {
      return res.status(400).json({ message: "Email not verified" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      username: user.username
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});
