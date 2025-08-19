// Get all bots (public)
app.get('/public-bots', async (req, res) => {
  try {
    const bots = await Bot.find({}); // Bot is your Mongoose model
    res.json(bots);
  } catch (error) {
    console.error("Error fetching bots:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found" });
  if (user.isVerified) return res.status(400).json({ error: "User already verified" });

  // generate token again (expires in 15min)
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });

  const verifyLink = `${process.env.FRONTEND_URL}/verify-success.html?token=${token}`;

  await sendVerificationEmail(user.email, verifyLink);
  res.json({ message: "Verification email resent" });
});
