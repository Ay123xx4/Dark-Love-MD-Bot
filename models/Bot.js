import mongoose from "mongoose";

const botSchema = new mongoose.Schema({
  repoName: String,
  repoLink: String,
  uploadedBy: String
});

export default mongoose.model("Bot", botSchema);
