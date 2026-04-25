import { pipeline, env as hfEnv } from "@xenova/transformers";

// 768 dims matches both our Qdrant collection config and the mpnet model output.
export const EMBEDDING_DIMENSIONS = 768;

// all-mpnet-base-v2 is a well-benchmarked sentence-embedding model: 768 dims,
// strong semantic retrieval quality, runs on CPU in tens of milliseconds per
// text. Model weights are downloaded once on first use (~110 MB quantized)
// and cached under node_modules/.cache, so subsequent starts are fully offline.
const MODEL_NAME = "Xenova/all-mpnet-base-v2";

// Keep the quantized variant enabled (default). It's much smaller/faster and
// quality loss for retrieval is negligible.
hfEnv.allowLocalModels = true;
hfEnv.useBrowserCache = false;

let extractorPromise = null;

// Lazy singleton so we only load the model once per process. The first
// embedding call triggers download + init (~30s cold, <1s warm).
async function getExtractor() {
  if (!extractorPromise) {
    console.log(`[embed] loading model ${MODEL_NAME} (first run may download ~110MB)...`);
    extractorPromise = pipeline("feature-extraction", MODEL_NAME).then((ext) => {
      console.log(`[embed] model ${MODEL_NAME} ready`);
      return ext;
    });
  }
  return extractorPromise;
}

export async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function embedTextBatch(texts) {
  if (!texts.length) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });

  // Batch output has shape [batchSize, 768]. Convert the flat Float32Array
  // back into an array of per-text vectors.
  const [batchSize, dim] = output.dims;
  if (dim !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dim mismatch: got ${dim}, expected ${EMBEDDING_DIMENSIONS}`
    );
  }
  const flat = output.data;
  const result = new Array(batchSize);
  for (let i = 0; i < batchSize; i++) {
    result[i] = Array.from(flat.slice(i * dim, (i + 1) * dim));
  }
  return result;
}
