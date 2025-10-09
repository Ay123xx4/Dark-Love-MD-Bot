import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// Define User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false },
  verificationCode: String,
});

const User = mongoose.model("User", userSchema);

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ SIGNUP ROUTE (fixed to allow different email or username)
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Allow signup if either username OR email is different
    const existingUser = await User.findOne({ username, email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Account with this username and email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Save user with verified = false
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verified: false,
      verificationCode,
    });

    await newUser.save();

    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Dark-Love-MD Email Verification",
      text: `Hello ${username}, your verification code is: ${verificationCode}`,
    });

    return res.status(200).json({
      success: true,
      message: "Email verification code sent",
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during signup" });
  }
});

// ✅ VERIFY ROUTE
app.post("/verify", async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findOne({ verificationCode: code });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Code incorrect" });
    }

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error("Verification error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during verification" });
  }
});

// ✅ LOGIN ROUTE (unchanged, with better feedback)
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Login successful", user });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
});

// ✅ ROOT ROUTE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Handle 404 routes
app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
