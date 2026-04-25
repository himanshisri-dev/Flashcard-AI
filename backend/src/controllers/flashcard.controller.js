import { Flashcard } from "../models/Flashcard.js";
import { Pdf } from "../models/Pdf.js";
import { ApiError } from "../utils/apiError.js";
import { maxLen } from "../utils/validators.js";

export async function listFlashcardsByPdf(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.pdfId, userId: req.user.id }).lean();
  if (!pdf) throw ApiError.notFound("PDF not found");

  const flashcards = await Flashcard.find({ pdfId: pdf._id, userId: req.user.id })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ flashcards });
}

export async function updateFlashcard(req, res) {
  const { front, back } = req.body || {};
  const update = {};

  if (front !== undefined) {
    if (typeof front !== "string" || !front.trim()) {
      throw ApiError.badRequest("front must be a non-empty string");
    }
    maxLen(front, 300, "front");
    update.front = front.trim();
  }
  if (back !== undefined) {
    if (typeof back !== "string" || !back.trim()) {
      throw ApiError.badRequest("back must be a non-empty string");
    }
    maxLen(back, 800, "back");
    update.back = back.trim();
  }
  if (!Object.keys(update).length) throw ApiError.badRequest("Nothing to update");

  const card = await Flashcard.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    update,
    { new: true }
  ).lean();

  if (!card) throw ApiError.notFound("Flashcard not found");
  res.json({ flashcard: card });
}

export async function deleteFlashcard(req, res) {
  const result = await Flashcard.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  }).lean();
  if (!result) throw ApiError.notFound("Flashcard not found");
  res.json({ ok: true });
}
