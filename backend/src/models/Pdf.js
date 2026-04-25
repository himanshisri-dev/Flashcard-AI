import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    subject: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
      index: true,
    },
    error: { type: String, default: "" },

    chunkCount: { type: Number, default: 0 },
    embeddingStatus: {
      type: String,
      enum: ["pending", "ready", "failed"],
      default: "pending",
      index: true,
    },
    embeddingError: { type: String, default: "" },
  },
  { timestamps: true }
);

pdfSchema.index({ userId: 1, createdAt: -1 });

export const Pdf = mongoose.model("Pdf", pdfSchema);
