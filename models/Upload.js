import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema({
  username: { type: String, required: true },
  botName: { type: String, required: true },
  botRepo: { type: String, required: true },
  botFile: { type: String, required: true },
  zipFile: { type: String },
  logo: { type: String },
  picture: { type: String },
  description: { type: String }
}, { timestamps: true });

export default mongoose.model("Upload", uploadSchema);
                                         
