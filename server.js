const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== Database Connection =====
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error(err));

// ===== User Schema =====
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    verified: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// ===== Bot Schema =====
const botSchema = new mongoose.Schema({
    name: String,
    repoUrl: String,
    logoUrl: String,
    description: String,
    uploadedBy: String
});
const Bot = mongoose.model('Bot', botSchema);

// ===== Nodemailer Setup =====
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ===== Middleware =====
function authRequired(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = decoded;
        next();
    });
}

// ===== Email Verification =====
app.get('/verify/:token', async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).send('User not found');
        user.verified = true;
        await user.save();
        res.send('<h2>Email verified successfully. You can now log in.</h2>');
    } catch (err) {
        res.status(400).send('Invalid or expired token');
    }
});

// ===== Signup =====
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ message: 'All fields required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verifyLink = `${process.env.BASE_URL}/verify/${token}`;

    const htmlContent = `
        <div style="font-family:sans-serif; padding:20px; background:#f4f4f4;">
            <h2>Welcome to Dark-Love-MD</h2>
            <p>This is where you can see all bot repo and also visit them for deployment.</p>
            <p>Click below to verify your email:</p>
            <a href="${verifyLink}" style="display:inline-block;padding:10px 20px;background:#ff4b5c;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
            <p style="margin-top:20px;color:gray;">©2025 Dark-Love-MD Bot Platform</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Dark-Love-MD',
        html: htmlContent
    });

    res.json({ message: 'Signup successful, please check your email to verify.' });
});

// ===== Login =====
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid username or password' });

    if (!user.verified) return res.status(403).json({ message: 'Please verify your email first.' });

    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
});

// ===== Upload Bot =====
app.post('/upload', authRequired, async (req, res) => {
    const { name, repoUrl, logoUrl, description, password } = req.body;
    const user = await User.findOne({ username: req.user.username });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ message: 'Invalid password for upload' });

    const bot = new Bot({ name, repoUrl, logoUrl, description, uploadedBy: req.user.username });
    await bot.save();
    res.json({ message: 'Bot uploaded successfully' });
});

// ===== Get Bots (with search) =====
app.get('/bots', async (req, res) => {
    const search = req.query.search || '';
    const bots = await Bot.find({ name: { $regex: search, $options: 'i' } });
    res.json(bots);
});

// ===== Delete Bot =====
app.post('/delete', authRequired, async (req, res) => {
    const { botId, password } = req.body;
    const bot = await Bot.findById(botId);
    if (!bot) return res.status(404).json({ message: 'Bot not found' });

    if (req.user.username !== process.env.OWNER_USERNAME && req.user.username !== bot.uploadedBy)
        return res.status(403).json({ message: 'You do not own this bot' });

    const user = await User.findOne({ username: req.user.username });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ message: 'Invalid password' });

    await Bot.findByIdAndDelete(botId);
    res.json({ message: 'Bot deleted successfully' });
});

// ===== Start Server =====
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
