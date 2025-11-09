import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";

dotenv.config();
const app = express();

// === Middleware ===
app.use(express.json());
app.use(cors({
  origin: "https://dark-love-md.vercel.app", // your frontend domain
  credentials: true,
}));

// === MongoDB Connection ===
mongoose.connect(process.env.MONGODB_URI || "your_mongodb_connection_string", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

// === Schema ===
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false },
  verificationCode: String,
});

const User = mongoose.model("User", userSchema);

// === Email Transporter ===
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// === ROUTES ===

// 🟢 SIGNUP
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // check if email OR username already exists and is verified
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser && existingUser.verified) {
      return res.status(400).json({ message: "Username or email already exists!" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // create or update user record
    const user = existingUser
      ? await User.findOneAndUpdate(
          { email },
          { username, password: hashedPassword, verificationCode, verified: false },
          { new: true }
        )
      : await User.create({
          username,
          email,
          password: hashedPassword,
          verificationCode,
        });

    // send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Dark-Love-MD Email Verification Code",
      text: `Your verification code is: ${verificationCode}`,
    });

    res.json({ message: "Email verification code sent!" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 🟢 VERIFY EMAIL
app.post("/api/verify", async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findOne({ verificationCode: code });

    if (!user) return res.status(400).json({ message: "Invalid verification code" });

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    res.json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 🟢 LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user)
      return res.status(400).json({ message: "Invalid username or password" });

    if (!user.verified)
      return res.status(400).json({ message: "Email not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid username or password" });

    res.json({ message: "Login successful", username: user.username });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// === TEST ROUTE ===
app.get("/", (req, res) => {
  res.send("✅ Dark-Love-MD Backend is Live and Working!");
});

// === START SERVER ===
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
