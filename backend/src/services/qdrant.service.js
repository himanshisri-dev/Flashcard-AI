import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";
import { env } from "../config/env.js";
import { embedTextBatch, EMBEDDING_DIMENSIONS } from "./embeddings.service.js";

// Fixed namespace → deterministic point IDs per (pdfId, chunkIndex), so
// re-embedding the same PDF overwrites old points instead of duplicating them.
const NAMESPACE = "6b8b9c44-5c3e-4a9b-9f2a-8b6e1d2f7c3d";

const client = new QdrantClient({
  url: env.qdrantUrl,
  ...(env.qdrantApiKey ? { apiKey: env.qdrantApiKey } : {}),
});

export async function ensureCollection() {
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === env.qdrantCollection);
  if (exists) {
    console.log(`[qdrant] collection "${env.qdrantCollection}" ready`);
    return;
  }
  await client.createCollection(env.qdrantCollection, {
    vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
  });
  await client.createPayloadIndex(env.qdrantCollection, {
    field_name: "pdfId",
    field_schema: "keyword",
  });
  await client.createPayloadIndex(env.qdrantCollection, {
    field_name: "userId",
    field_schema: "keyword",
  });
  console.log(
    `[qdrant] created "${env.qdrantCollection}" (dim=${EMBEDDING_DIMENSIONS}, Cosine) with pdfId+userId payload indexes`
  );
}

function pointId(pdfId, chunkIndex) {
  return uuidv5(`${pdfId}:${chunkIndex}`, NAMESPACE);
}

// Embed in batches to keep memory pressure low — the local Transformers.js
// model has no rate limits, so we just pick a batch size that balances
// throughput vs memory per forward pass.
const BATCH_SIZE = 16;

async function embedChunks(chunks) {
  const vectors = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const slice = chunks.slice(i, i + BATCH_SIZE);
    const batchVectors = await embedTextBatch(slice);
    vectors.push(...batchVectors);
  }
  return vectors;
}

export async function upsertChunks(pdfId, userId, chunks) {
  if (!chunks.length) return 0;

  const vectors = await embedChunks(chunks);
  const points = chunks.map((text, i) => ({
    id: pointId(pdfId, i),
    vector: vectors[i],
    payload: { pdfId, userId, chunkIndex: i, text },
  }));

  const upsertBatchSize = 100;
  for (let i = 0; i < points.length; i += upsertBatchSize) {
    await client.upsert(env.qdrantCollection, {
      points: points.slice(i, i + upsertBatchSize),
    });
  }
  return points.length;
}

export async function searchChunks({ vector, pdfId, userId, topK = 5 }) {
  return client.search(env.qdrantCollection, {
    vector,
    limit: topK,
    filter: {
      must: [
        { key: "pdfId", match: { value: pdfId } },
        { key: "userId", match: { value: userId } },
      ],
    },
    with_payload: true,
  });
}

export async function deleteChunksByPdf(pdfId) {
  await client.delete(env.qdrantCollection, {
    filter: {
      must: [{ key: "pdfId", match: { value: pdfId } }],
    },
  });
}
