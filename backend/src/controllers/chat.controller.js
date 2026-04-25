import { Pdf } from "../models/Pdf.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { ApiError } from "../utils/apiError.js";
import { required } from "../utils/validators.js";
import { embedText } from "../services/embeddings.service.js";
import { searchChunks } from "../services/qdrant.service.js";
import { streamChat } from "../services/groq.service.js";

const HISTORY_LIMIT = 50;
const TOP_K = 5;

// GET /api/pdfs/:id/chat
// Returns the last HISTORY_LIMIT messages for this (pdf, user) ordered
// oldest-first so the UI can render them top-to-bottom immediately.
export async function getChatHistory(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.id, userId: req.user.id }).lean();
  if (!pdf) throw ApiError.notFound("PDF not found");

  const recent = await ChatMessage.find({ pdfId: pdf._id, userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();

  recent.reverse();
  res.json({ messages: recent });
}

// DELETE /api/pdfs/:id/chat — wipe history for this (pdf, user).
export async function clearChatHistory(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.id, userId: req.user.id }).lean();
  if (!pdf) throw ApiError.notFound("PDF not found");

  const { deletedCount } = await ChatMessage.deleteMany({
    pdfId: pdf._id,
    userId: req.user.id,
  });
  res.json({ ok: true, deletedCount });
}

function sseWrite(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// POST /api/pdfs/:id/chat — SSE endpoint.
// Flow:
//   1. Validate PDF ownership + embeddingStatus === "ready"
//   2. Persist the user's message
//   3. Embed the question locally, search Qdrant for top-K chunks (filtered
//      by pdfId + userId so users never see each other's data)
//   4. Build the RAG prompt and stream Gemini's answer as SSE "chunk" events
//   5. On completion, persist the assistant message and emit "done"
//   6. On error anywhere after headers are flushed, emit "error" and close
export async function postChatMessage(req, res) {
  const pdf = await Pdf.findOne({ _id: req.params.id, userId: req.user.id });
  if (!pdf) throw ApiError.notFound("PDF not found");
  if (pdf.embeddingStatus !== "ready") {
    throw ApiError.badRequest(
      "This document's Q&A index isn't ready yet. Wait for embeddingStatus to become 'ready' (or POST to /api/pdfs/:id/reindex)."
    );
  }

  const body = req.body || {};
  required(body, ["question"]);
  const question = String(body.question).trim();
  if (!question) throw ApiError.badRequest("question cannot be empty");
  if (question.length > 2000) throw ApiError.badRequest("question too long (max 2000 chars)");

  // Persist the user's message BEFORE opening the stream so it's durable even
  // if the stream fails mid-flight.
  await ChatMessage.create({
    pdfId: pdf._id,
    userId: req.user.id,
    role: "user",
    content: question,
  });

  // Open SSE. After this point, all errors must be reported as SSE "error"
  // events rather than JSON + status codes — headers are already sent.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let assembled = "";
  try {
    const queryVector = await embedText(question);

    const hits = await searchChunks({
      vector: queryVector,
      pdfId: pdf._id.toString(),
      userId: req.user.id.toString(),
      topK: TOP_K,
    });

    const contextChunks = hits
      .map((h) => h.payload?.text || "")
      .filter(Boolean)
      .join("\n---\n");

    const prompt = [
      "You are a friendly AI tutor helping a student study their uploaded document.",
      "",
      "RULES:",
      "1. For greetings, thanks, acknowledgements, or casual conversation (e.g. 'hi', 'thanks', 'ok', 'yes', 'no', 'bye'), respond naturally and warmly in 1-2 sentences. Do NOT say 'I couldn't find that in the document' for these.",
      "2. For questions or requests that are clearly about the document content, answer using ONLY the context below. If the answer isn't in the context, say \"I couldn't find that in the document.\"",
      "3. For off-topic requests unrelated to studying (e.g. 'give me a study plan', 'write code'), politely explain you can only help with this document's content.",
      "4. Never invent facts. Keep answers concise and clear.",
      "",
      "DOCUMENT CONTEXT:",
      contextChunks || "(no context retrieved)",
      "",
      `STUDENT: ${question}`,
    ].join("\n");

    for await (const text of streamChat(prompt)) {
      assembled += text;
      sseWrite(res, { type: "chunk", content: text });
    }

    const assistantMsg = await ChatMessage.create({
      pdfId: pdf._id,
      userId: req.user.id,
      role: "assistant",
      content: assembled,
    });

    sseWrite(res, { type: "done", messageId: assistantMsg._id.toString() });
    res.end();
  } catch (err) {
    console.error(`[chat] stream failed for pdf ${pdf._id}:`, err.message);
    try {
      sseWrite(res, {
        type: "error",
        message: err.message?.slice(0, 300) || "Chat failed",
      });
    } catch {
      // Client may have disconnected — nothing to do.
    }
    res.end();
  }
}
