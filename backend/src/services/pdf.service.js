import fs from "fs/promises";
import { createRequire } from "module";

// pdf-parse is CommonJS and its index.js runs debug code that reads a test PDF
// at import time. Pointing createRequire at the inner module avoids that trap.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

const MAX_FLASHCARD_CHARS = 30000;

export async function extractText(filePath) {
  const buffer = await fs.readFile(filePath);
  const { text } = await pdfParse(buffer);
  return (text || "").replace(/\s+\n/g, "\n").trim();
}

export function truncateForFlashcards(text) {
  return text.length > MAX_FLASHCARD_CHARS ? text.slice(0, MAX_FLASHCARD_CHARS) : text;
}

// Chunk with ~500 char target and ~100 char overlap, preferring sentence/paragraph
// boundaries so context isn't sliced mid-word.
export function chunkText(text, chunkSize = 500, overlap = 100) {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;
  const len = clean.length;

  while (start < len) {
    let end = Math.min(start + chunkSize, len);

    if (end < len) {
      const window = clean.slice(start, end);
      const lastBreak = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("\n"),
        window.lastIndexOf(" ")
      );
      if (lastBreak > chunkSize * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= len) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
