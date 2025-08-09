import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB using the MONGO_URI environment variable
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB connected successfully");
}).catch((err) => {
  console.error("❌ MongoDB connect error:", err.message);
});

// Your existing routes and middleware go here

app.get("/", (req, res) => {
    res.redirect("/login");
});

app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});



