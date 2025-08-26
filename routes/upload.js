import express from "express";
import Upload from "../models/Upload.js";

const router = express.Router();

// Upload new bot
router.post("/", async (req, res) => {
  try {
    const newUpload = new Upload(req.body);
    await newUpload.save();
    res.json({ message: "Upload successful", upload: newUpload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all uploads
router.get("/", async (req, res) => {
  try {
    const uploads = await Upload.find().sort({ createdAt: -1 });
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
  
