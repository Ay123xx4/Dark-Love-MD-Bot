import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: ["https://dark-love-md-github-repo.vercel.app"], // change to your actual vercel frontend URL
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/upload", uploadRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

