import Groq from "groq-sdk";
import { env } from "../config/env.js";

const groq = new Groq({ apiKey: env.groqApiKey });

const MODEL = "llama-3.3-70b-versatile";

export async function generateFlashcards(text, subject = "") {
  const systemPrompt = [
    "You are an expert teacher creating study flashcards from a document.",
    "Generate between 10 and 20 high-quality flashcards covering the most important concepts.",
    "Each flashcard has a `front` (question/prompt, <=300 chars) and `back` (answer, <=800 chars).",
    "Cover definitions, key facts, cause-and-effect, and comparisons.",
    "Avoid trivia and duplicates. Prefer clarity over length.",
    subject ? `Subject context: ${subject}.` : "",
    "Respond with ONLY valid JSON in this exact format: {\"flashcards\": [{\"front\": \"...\", \"back\": \"...\"}]}",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `DOCUMENT:\n${text}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const raw = response.choices[0]?.message?.content || "{}";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Groq returned invalid JSON: ${err.message}`);
  }

  const cards = Array.isArray(parsed?.flashcards) ? parsed.flashcards : [];
  return cards
    .filter((c) => c?.front && c?.back)
    .map((c) => ({
      front: String(c.front).slice(0, 300).trim(),
      back: String(c.back).slice(0, 800).trim(),
    }));
}

// Returns an async generator that yields text chunks from Groq's stream.
export async function* streamChat(prompt) {
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    temperature: 0.3,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) yield text;
  }
}
