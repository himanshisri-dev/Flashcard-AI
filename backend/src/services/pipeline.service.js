import { Pdf } from "../models/Pdf.js";
import { Flashcard } from "../models/Flashcard.js";
import { extractText, truncateForFlashcards, chunkText } from "./pdf.service.js";
import { generateFlashcards } from "./groq.service.js";
import { upsertChunks } from "./qdrant.service.js";

// Independent job: generate flashcards and persist. Sets status="ready" or "failed".
async function runFlashcardJob(pdf, text) {
  try {
    const cards = await generateFlashcards(truncateForFlashcards(text), pdf.subject);
    if (!cards.length) throw new Error("Model returned no flashcards");

    await Flashcard.insertMany(
      cards.map((c) => ({ pdfId: pdf._id, userId: pdf.userId, front: c.front, back: c.back }))
    );
    await Pdf.findByIdAndUpdate(pdf._id, { status: "ready", error: "" });
    console.log(`[pipeline] flashcards ready (${cards.length}) for pdf ${pdf._id}`);
  } catch (err) {
    console.error(`[pipeline] flashcard job failed for pdf ${pdf._id}:`, err.message);
    await Pdf.findByIdAndUpdate(pdf._id, {
      status: "failed",
      error: err.message?.slice(0, 500) || "Flashcard generation failed",
    });
  }
}

// Independent job: chunk + embed + upsert to Qdrant. Isolated from flashcards
// so a Gemini embedding failure doesn't block flashcard readiness (and vice
// versa). Sets embeddingStatus="ready" or "failed".
export async function runEmbeddingJob(pdf, text) {
  try {
    const chunks = chunkText(text);
    if (!chunks.length) throw new Error("No chunks produced from extracted text");

    const count = await upsertChunks(pdf._id.toString(), pdf.userId.toString(), chunks);
    await Pdf.findByIdAndUpdate(pdf._id, {
      chunkCount: count,
      embeddingStatus: "ready",
      embeddingError: "",
    });
    console.log(`[pipeline] embeddings ready (${count} chunks) for pdf ${pdf._id}`);
  } catch (err) {
    console.error(`[pipeline] embedding job failed for pdf ${pdf._id}:`, err.message);
    await Pdf.findByIdAndUpdate(pdf._id, {
      embeddingStatus: "failed",
      embeddingError: err.message?.slice(0, 500) || "Embedding failed",
    });
  }
}

// Entry point — called (without await) from the upload controller.
export async function runBackgroundPipeline(pdfDoc) {
  let text;
  try {
    text = await extractText(pdfDoc.filePath);
    if (!text) throw new Error("PDF appears to contain no extractable text");
  } catch (err) {
    console.error(`[pipeline] extraction failed for pdf ${pdfDoc._id}:`, err.message);
    await Pdf.findByIdAndUpdate(pdfDoc._id, {
      status: "failed",
      error: `Extraction failed: ${err.message?.slice(0, 400)}`,
      embeddingStatus: "failed",
      embeddingError: `Extraction failed: ${err.message?.slice(0, 400)}`,
    });
    return;
  }

  await Promise.allSettled([runFlashcardJob(pdfDoc, text), runEmbeddingJob(pdfDoc, text)]);
}

// Re-run the embedding half only — useful for PDFs uploaded before embedding
// was wired in, or for retrying after an embedding failure without redoing
// flashcard generation.
export async function reembedExistingPdf(pdfDoc) {
  let text;
  try {
    text = await extractText(pdfDoc.filePath);
    if (!text) throw new Error("PDF appears to contain no extractable text");
  } catch (err) {
    console.error(`[reindex] extraction failed for pdf ${pdfDoc._id}:`, err.message);
    await Pdf.findByIdAndUpdate(pdfDoc._id, {
      embeddingStatus: "failed",
      embeddingError: `Extraction failed: ${err.message?.slice(0, 400)}`,
    });
    return;
  }
  await runEmbeddingJob(pdfDoc, text);
}
