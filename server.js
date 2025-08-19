import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import botRoutes from "./routes/bot.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ["https://your-vercel-frontend.vercel.app"], // replace with your vercel domain
  credentials: true
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bots", botRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Dark-Love-MD Backend Running ✅" });
});

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
