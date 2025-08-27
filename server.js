import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());
app.use(cors());

// === MongoDB Connection ===
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/darklovemd", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// === Schemas ===
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verificationCode: { type: String },
});

const uploadSchema = new mongoose.Schema({
  username: String,
  botName: String,
  botRepo: String,
  botFile: String,
  zipFile: String,
  logo: String,
  description: String,
});

const User = mongoose.model("User", userSchema);
const Upload = mongoose.model("Upload", uploadSchema);

// === Multer Setup (file uploads) ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// === Email Setup (Nodemailer with Gmail or SMTP) ===
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password
  },
});

// === Signup with Email Verification ===
app.post("/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.json({ error: "Username or Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new User({
      username,
      email,
      password: hashed,
      verified: false,
      verificationCode,
    });
    await user.save();

    // Send verification email
    await transporter.sendMail({
      from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your Email",
      text: `Your verification code is: ${verificationCode}`,
    });

    res.json({ message: "Signup successful, check your email for verification code" });
  } catch (err) {
    res.json({ error: "Signup failed" });
  }
});

// === Verify Email ===
app.post("/auth/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "User not found" });

    if (user.verificationCode !== code) return res.json({ error: "Invalid verification code" });

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.json({ error: "Verification failed" });
  }
});

// === Login (only if verified) ===
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ error: "Invalid username or password" });

    if (!user.verified) return res.json({ error: "Please verify your email first" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ error: "Invalid username or password" });

    res.json({ message: "Login successful", username: user.username });
  } catch (err) {
    res.json({ error: "Login failed" });
  }
});

// === Settings Routes ===
app.post("/auth/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.json({ error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.json({ error: "Error updating password" });
  }
});

app.post("/auth/delete-account", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ error: "Incorrect password" });

    await User.deleteOne({ username });
    await Upload.deleteMany({ username });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.json({ error: "Error deleting account" });
  }
});

// === Upload Bot ===
app.post("/upload", upload.fields([{ name: "zipFile" }, { name: "logo" }]), async (req, res) => {
  try {
    const { username, botName, botRepo, botFile, description } = req.body;
    const zipFile = req.files["zipFile"] ? req.files["zipFile"][0].filename : null;
    const logo = req.files["logo"] ? req.files["logo"][0].filename : null;

    const newUpload = new Upload({
      username,
      botName,
      botRepo,
      botFile,
      zipFile,
      logo,
      description,
    });

    await newUpload.save();
    res.json({ message: "Upload successful" });
  } catch (err) {
    res.json({ error: "Upload failed" });
  }
});

// === Get Uploads for Dashboard ===
app.get("/uploads", async (req, res) => {
  try {
    const uploads = await Upload.find();
    res.json(uploads);
  } catch (err) {
    res.json({ error: "Failed to fetch uploads" });
  }
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
