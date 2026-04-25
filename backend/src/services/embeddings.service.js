import { env } from "../config/env.js";

// Jina AI embeddings API — free tier, 768-dim, no local model download.
// Replaces Transformers.js which exceeded Render's 512MB free-tier RAM limit.
export const EMBEDDING_DIMENSIONS = 768;

const JINA_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-embeddings-v2-base-en";

export async function embedTextBatch(texts) {
  if (!texts.length) return [];

  const response = await fetch(JINA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.jinaApiKey}`,
    },
    body: JSON.stringify({ model: JINA_MODEL, input: texts }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Jina embedding failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function embedText(text) {
  const results = await embedTextBatch([text]);
  return results[0];
}
