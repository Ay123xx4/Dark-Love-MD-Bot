import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import sendVerificationEmail from "../utils/sendVerificationEmail.js";

const router = express.Router();

// =================== SIGNUP ===================
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user (unverified at first)
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    await user.save();

    // generate email verification token (expires in 15 min)
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // send email
    await sendVerificationEmail(user.email, token);

    return res.status(201).json({ 
      message: "Signup successful. Please check your email to verify." 
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =================== VERIFY EMAIL ===================
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(400).send("Invalid token");

    user.isVerified = true;
    await user.save();

    res.redirect("/verify-success.html"); // front-end success page
  } catch (err) {
    console.error("Verify error:", err);
    res.status(400).send("Invalid or expired token");
  }
});

// =================== LOGIN ===================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // check email verification
    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // issue JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, username: user.username });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
