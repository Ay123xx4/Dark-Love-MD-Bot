require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Mongo ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((e) => {
    console.error('❌ MongoDB connect error:', e.message);
    process.exit(1);
  });

// ---------- Schemas ----------
const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema);

const botSchema = new mongoose.Schema(
  {
    name: String,
    repoUrl: String,
    logoUrl: String, // file path or external URL
    description: String,
    uploadedBy: String,
  },
  { timestamps: true }
);
const Bot = mongoose.model('Bot', botSchema);

// ---------- Multer for logo uploads ----------
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.png');
    cb(null, `logo_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ---------- Mailer ----------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------- Helpers ----------
function signAuthToken(user) {
  // keep token small; we’ll look up fresh user on protected routes
  return jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
}
function signVerifyToken(email) {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
async function sendVerificationEmail(username, email) {
  const token = signVerifyToken(email);
  const link = `${process.env.BASE_URL}/verify?token=${encodeURIComponent(token)}`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f6f7fb;padding:24px;">
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:640px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.08)">
      <tr>
        <td style="background:#111827;color:#fff;padding:16px 24px;font-size:18px;font-weight:700">
          Dark-Love-MD
        </td>
      </tr>
      <tr>
        <td style="padding:24px">
          <h2 style="margin:0 0 12px 0;color:#111827">Welcome to Dark-Love-MD</h2>
          <p style="margin:0 0 12px 0;color:#374151">Hi ${username},</p>
          <p style="margin:0 0 16px 0;color:#374151">
            This is where you can see all bot repo and also visit them for deployment.
          </p>
          <p style="margin:0 0 24px 0;color:#374151">
            Click below to verify your email (link expires in 15 minutes):
          </p>
          <p>
            <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
              Verify Email
            </a>
          </p>
          <p style="margin:24px 0 0 0;color:#6b7280;font-size:12px">
            ©2025 Dark-Love-MD Bot Platform
          </p>
        </td>
      </tr>
    </table>
  </div>`;

  await transporter.sendMail({
    from: `"Dark-Love-MD" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Dark-Love-MD',
    html,
  });
}

// Require auth + verified
async function authRequired(req, res, next) {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (!user.verified) {
      return res.status(403).json({ message: 'Please verify your email first.', redirect: '/verify-pending.html', email: user.email });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// ---------- Auth Routes ----------
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ message: 'All fields required' });

    const usernameTaken = await User.findOne({ username });
    if (usernameTaken) return res.status(400).json({ message: 'Username already taken' });

    const emailTaken = await User.findOne({ email });
    if (emailTaken) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed, verified: false });

    await sendVerificationEmail(username, email);

    // tell frontend to go to verify pending page
    return res.json({ success: true, message: 'Signup successful! Check your email to verify.', redirect: '/verify-pending.html', email });
  } catch (e) {
    console.error('SIGNUP ERROR:', e);
    return res.status(500).json({ message: 'Server error during signup' });
  }
});

app.get('/verify', async (req, res) => {
  try {
    const token = req.query.token || '';
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).send('User not found');
    if (!user.verified) {
      user.verified = true;
      await user.save();
    }
    return res.redirect('/verify-success.html');
  } catch {
    return res.status(400).send('Invalid or expired verification link.');
  }
});

app.post('/resend-verification', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.verified) return res.status(400).json({ message: 'User already verified' });

  await sendVerificationEmail(user.username, email);
  return res.json({ success: true, message: 'Verification email resent!' });
});

app.post('/reset-email', async (req, res) => {
  const { oldEmail, newEmail } = req.body || {};
  if (!oldEmail || !newEmail) return res.status(400).json({ message: 'Both emails required' });
  const user = await User.findOne({ email: oldEmail });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.verified) return res.status(400).json({ message: 'Cannot change email after verification' });

  const used = await User.findOne({ email: newEmail });
  if (used) return res.status(400).json({ message: 'New email already in use' });

  user.email = newEmail;
  await user.save();
  await sendVerificationEmail(user.username, newEmail);
  return res.json({ success: true, message: 'Email updated and verification sent!' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: 'Username or password is incorrect' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: 'Username or password is incorrect' });
  if (!user.verified) return res.status(403).json({ message: 'Please verify your email first.', redirect: '/verify-pending.html', email: user.email });

  const token = signAuthToken(user);
  return res.json({ success: true, token, username: user.username });
});

// ---------- Bot Routes ----------
app.get('/bots', authRequired, async (req, res) => {
  const search = (req.query.search || '').trim();
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};
  const bots = await Bot.find(query).sort({ createdAt: -1 });
  res.json(bots);
});

app.post('/upload', authRequired, upload.single('logo'), async (req, res) => {
  try {
    const { name, repoUrl, description, password, logoUrl } = req.body || {};
    if (!name || !repoUrl || !password) return res.status(400).json({ message: 'Name, repo URL and password are required' });

    const ok = await bcrypt.compare(password, req.user.password);
    if (!ok) return res.status(403).json({ message: 'Invalid password for upload' });

    let finalLogo = logoUrl || '';
    if (req.file) finalLogo = `/uploads/${req.file.filename}`;

    const bot = await Bot.create({
      name,
      repoUrl,
      logoUrl: finalLogo,
      description: description || '',
      uploadedBy: req.user.username,
    });

    return res.json({ success: true, message: 'Bot uploaded successfully', bot });
  } catch (e) {
    console.error('UPLOAD ERROR:', e);
    return res.status(500).json({ message: 'Server error during upload' });
  }
});

app.post('/delete', authRequired, async (req, res) => {
  const { botId, password } = req.body || {};
  if (!botId || !password) return res.status(400).json({ message: 'Bot ID and password are required' });
  const bot = await Bot.findById(botId);
  if (!bot) return res.status(404).json({ message: 'Bot not found' });

  const isOwner = bot.uploadedBy === req.user.username;
  const isAdmin = req.user.username === process.env.OWNER_USERNAME;

  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'You do not own this bot' });

  // If admin, require admin password; if owner, require owner’s own password
  let passOk = false;
  if (isAdmin && !isOwner) {
    passOk = password === process.env.OWNER_PASSWORD; // admin override
  } else {
    passOk = await bcrypt.compare(password, req.user.password);
  }
  if (!passOk) return res.status(403).json({ message: 'Invalid password' });

  await Bot.findByIdAndDelete(botId);
  return res.json({ success: true, message: 'Bot deleted successfully' });
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 Server running on ${process.env.BASE_URL || 'http://localhost:'+PORT}`));
