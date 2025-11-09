import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// 🔧 Serve static frontend if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ MongoDB Connection with Safety Checks
const MONGO_URI = process.env.MONGO_URI?.trim();
if (!MONGO_URI) {
  console.error("❌ ERROR: MongoDB URI is missing. Please set MONGO_URI in environment variables.");
} else if (!MONGO_URI.startsWith("mongodb://") && !MONGO_URI.startsWith("mongodb+srv://")) {
  console.error("❌ ERROR: Invalid MongoDB URI scheme. It must start with mongodb:// or mongodb+srv://");
} else {
  mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("MongoDB Connection Error:", err.message));
}

// ✅ Schemas
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false },
  verificationCode: String,
});

const User = mongoose.model("User", userSchema);

// ✅ Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Routes
app.get("/", (req, res) => {
  res.send("✅ Dark-Love-MD Backend is Live and Working!");
});

// 🟢 Signup Route
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check for existing email or username
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.json({ success: false, message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verificationCode,
      verified: false,
    });

    await newUser.save();

    // Send verification code to email
    await transporter.sendMail({
      from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email Verification Code",
      text: `Your verification code is ${verificationCode}`,
    });

    res.json({
      success: true,
      message: "Email verification code sent!",
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error during signup" });
  }
});

// 🟢 Verify Route
app.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.verificationCode !== code)
      return res.json({ success: false, message: "Invalid verification code" });

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    res.json({ success: true, message: "Email verified successfully!" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Verification failed" });
  }
});

// 🟢 Login Route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false, message: "Invalid username or password" });
    if (!user.verified) return res.json({ success: false, message: "Email not verified" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: "Invalid username or password" });

    res.json({
      success: true,
      message: "Login successful",
      username: user.username,
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error during login" });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
