import { Pdf } from "../models/Pdf.js";
import { Flashcard } from "../models/Flashcard.js";
import { ApiError } from "../utils/apiError.js";
import { generateQuizQuestions } from "../services/groq.service.js";

export async function generateQuiz(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.id, userId: req.user.id }).lean();
  if (!pdf) throw ApiError.notFound("PDF not found");

  const cards = await Flashcard.find({ pdfId: pdf._id, userId: req.user.id })
    .sort({ createdAt: 1 })
    .lean();

  if (cards.length < 2) {
    throw ApiError.badRequest("Need at least 2 flashcards to generate a quiz");
  }

  const questions = await generateQuizQuestions(cards);
  if (!questions.length) {
    throw ApiError.internal("Quiz generation returned no questions");
  }

  res.json({ questions });
}