// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    verified: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

// Transporter for Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Signup Route
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ message: 'All fields required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const verifyLink = `${process.env.BASE_URL}/verify?token=${token}`;

        const htmlEmail = `
            <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
                <div style="max-width: 600px; background: white; margin: auto; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #333;">Welcome to Dark-Love-MD</h2>
                    <p>This is where you can see all bot repos and visit them for deployment.</p>
                    <p>Click below to verify your email:</p>
                    <a href="${verifyLink}" style="display: inline-block; background: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">©2025 Dark-Love-MD Bot Platform</p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Welcome to Dark-Love-MD",
            html: htmlEmail
        });

        res.json({ message: 'Signup successful! Please check your email to verify your account.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// Email Verification Route
app.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await User.updateOne({ email: decoded.email }, { verified: true });
        res.send('<h2>Email verified successfully! You can now <a href="/">login</a>.</h2>');
    } catch (err) {
        res.status(400).send('Invalid or expired verification link.');
    }
});

// Start Server
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
