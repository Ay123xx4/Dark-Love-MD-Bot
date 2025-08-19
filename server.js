import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import botRoutes from "./routes/bots.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5500"
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin or tools with no origin
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("CORS not allowed from this origin"), false);
  },
  credentials: true
}));

app.use(express.json({ limit: "2mb" })); // base64 logo support

// Mongo connect
mongoose.connect(process.env.MONGO_URI, { dbName: "darklovemd" })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => {
    console.error("❌ MongoDB connect error:", err.message);
    process.exit(1);
  });

// Healthcheck
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Dark-Love-MD Backend", time: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bots", botRoutes);

// Not found
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));
