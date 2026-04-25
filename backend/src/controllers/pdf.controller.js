import fs from "fs/promises";
import { Pdf } from "../models/Pdf.js";
import { Flashcard } from "../models/Flashcard.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { ApiError } from "../utils/apiError.js";
import {
  runBackgroundPipeline,
  reembedExistingPdf,
} from "../services/pipeline.service.js";
import { deleteChunksByPdf } from "../services/qdrant.service.js";

export async function uploadPdf(req, res) {
  if (!req.file) throw ApiError.badRequest("No PDF file provided (field name: 'file')");

  const { subject = "" } = req.body || {};

  const pdf = await Pdf.create({
    userId: req.user.id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    filePath: req.file.path,
    subject: String(subject).trim().slice(0, 120),
    status: "processing",
    embeddingStatus: "pending",
  });

  // Fire and forget — never block the response.
  setImmediate(() => {
    runBackgroundPipeline(pdf).catch((err) =>
      console.error(`[pipeline] unhandled error for pdf ${pdf._id}:`, err)
    );
  });

  res.status(201).json({ pdf });
}

export async function listPdfs(req, res) {
  const pdfs = await Pdf.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ pdfs });
}

export async function getPdf(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.id, userId: req.user.id }).lean();
  if (!pdf) throw ApiError.notFound("PDF not found");
  res.json({ pdf });
}

export async function deletePdf(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.id, userId: req.user.id });
  if (!pdf) throw ApiError.notFound("PDF not found");

  // Cascade cleanup — each step isolated so one failure doesn't block the rest.
  const pdfId = pdf._id;
  const userId = pdf.userId;

  try {
    await Flashcard.deleteMany({ pdfId, userId });
  } catch (err) {
    console.error(`[delete] flashcard cleanup failed for pdf ${pdfId}:`, err.message);
  }

  try {
    await deleteChunksByPdf(pdfId.toString());
  } catch (err) {
    console.error(`[delete] qdrant cleanup failed for pdf ${pdfId}:`, err.message);
  }

  try {
    await ChatMessage.deleteMany({ pdfId, userId });
  } catch (err) {
    console.error(`[delete] chat cleanup failed for pdf ${pdfId}:`, err.message);
  }

  try {
    await fs.unlink(pdf.filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`[delete] file unlink failed for ${pdf.filePath}:`, err.message);
    }
  }

  await pdf.deleteOne();
  res.json({ ok: true });
}

// Re-run the embedding pipeline for an existing PDF (e.g., one uploaded before
// Checkpoint 3, or one whose embeddingStatus is "failed"). Flashcards are left
// alone. Returns immediately — flip embeddingStatus back to "pending" and fire
// the job in the background.
export async function reindexPdf(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.id, userId: req.user.id });
  if (!pdf) throw ApiError.notFound("PDF not found");

  await Pdf.findByIdAndUpdate(pdf._id, {
    embeddingStatus: "pending",
    embeddingError: "",
  });

  setImmediate(() => {
    reembedExistingPdf(pdf).catch((err) =>
      console.error(`[reindex] unhandled error for pdf ${pdf._id}:`, err)
    );
  });

  res.json({ ok: true, message: "Reindexing started" });
}
