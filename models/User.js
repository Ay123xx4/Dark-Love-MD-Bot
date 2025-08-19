import mongoose from "mongoose";

const botSchema = new mongoose.Schema({
  name: { type: String, required: true },
  repoUrl: { type: String, required: true },
  description: { type: String },
  logoUrl: { type: String },
  owner: { type: String, required: true }
});

export default mongoose.model("Bot", botSchema);
