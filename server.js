import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

import User from './models/User.js';
import Bot from './models/Bot.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error(err));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const newUser = new User({ username, email, password: hashedPassword, verified: false, verificationToken });
  await newUser.save();

  const verificationLink = `http://localhost:${process.env.PORT}/verify-email?token=${verificationToken}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your email',
    html: `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`
  });

  res.json({ message: 'Signup successful, please verify your email' });
});

app.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(400).send('Invalid token');
    user.verified = true;
    user.verificationToken = null;
    await user.save();
    res.send('Email verified! You can now log in.');
  } catch {
    res.status(400).send('Invalid or expired token');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Username or password is incorrect' });
  if (!user.verified) return res.status(400).json({ message: 'Please verify your email first' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Username or password is incorrect' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.post('/upload-bot', async (req, res) => {
  const { name, repoLink, logo } = req.body;
  const bot = new Bot({ name, repoLink, logo });
  await bot.save();
  res.json({ message: 'Bot uploaded successfully', bot });
});

app.get('/bots', async (req, res) => {
  const bots = await Bot.find();
  res.json(bots);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(process.env.PORT, () => console.log(`🟢 Server running on port ${process.env.PORT}`));
