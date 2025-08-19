import mongoose from "mongoose";

const botSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url:  { type: String, required: true, trim: true },
    logo: { type: String, required: true }, // base64 data URL
    description: { type: String },
    owner: { type: String, required: true } // username
  },
  { timestamps: true }
);

export default mongoose.model("Bot", botSchema);
