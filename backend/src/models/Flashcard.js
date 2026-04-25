import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema(
  {
    pdfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pdf",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    front: { type: String, required: true, trim: true, maxlength: 300 },
    back: { type: String, required: true, trim: true, maxlength: 800 },
  },
  { timestamps: true }
);

flashcardSchema.index({ pdfId: 1, createdAt: 1 });

export const Flashcard = mongoose.model("Flashcard", flashcardSchema);
