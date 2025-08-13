import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import User from './models/User.js';
import Bot from './models/Bot.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
mongoose.connect(
    "mongodb+srv://ayodejiayanfeoluwanimi:MyDarkLove123@cluster0.4ihukuk.mongodb.net/darklovemd?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.error("❌ MongoDB connect error:", err));

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "darklovemd698@gmail.com",
        pass: "xsph okhl moig ahyy" // Gmail app password
    }
});

// Signup route
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign({ email }, 'secretkey', { expiresIn: '1h' });

    const newUser = new User({
        username,
        email,
        password: hashedPassword,
        verificationToken
    });

    await newUser.save();

    const verifyLink = `http://localhost:5000/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
        from: '"Dark-Love-MD Bot" <darklovemd698@gmail.com>',
        to: email,
        subject: 'Verify Your Email - Dark-Love-MD Bot',
        html: `<h1>Email Verification</h1>
               <p>Click below to verify your email:</p>
               <a href="${verifyLink}">Verify Email</a>`
    });

    res.json({ message: 'Signup successful! Please check your email to verify your account.' });
});

// Email verification
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid verification link");

    try {
        const decoded = jwt.verify(token, 'secretkey');
        const user = await User.findOne({ email: decoded.email });
        if (!user) return res.status(400).send("User not found");

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.send("✅ Email verified! You can now log in.");
    } catch {
        res.status(400).send("Invalid or expired token");
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Username or password is incorrect' });

    if (!user.isVerified) return res.status(400).json({ error: 'Please verify your email first' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Username or password is incorrect' });

    const token = jwt.sign({ email: user.email }, 'secretkey', { expiresIn: '1d' });
    res.json({ message: 'Login successful', token });
});

// Upload bot route
app.post('/upload-bot', async (req, res) => {
    const { name, repoLink, logo, uploadedBy } = req.body;

    if (!name || !repoLink || !logo) {
        return res.status(400).json({ error: 'Name, Repo Link, and Logo are required' });
    }

    const newBot = new Bot({ name, repoLink, logo, uploadedBy });
    await newBot.save();

    res.json({ message: 'Bot uploaded successfully', bot: newBot });
});

// Fetch all bots
app.get('/bots', async (req, res) => {
    const bots = await Bot.find().sort({ createdAt: -1 });
    res.json(bots);
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));
