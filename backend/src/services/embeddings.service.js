import { pipeline, env as hfEnv } from "@xenova/transformers";

export const EMBEDDING_DIMENSIONS = 768;

const MODEL_NAME = "Xenova/all-mpnet-base-v2";

// Point cache to a persistent path inside the project so Render keeps it
// across restarts (within the same deploy). Falls back to default on local.
hfEnv.allowLocalModels = true;
hfEnv.useBrowserCache = false;
hfEnv.cacheDir = process.env.MODEL_CACHE_DIR || "./model-cache";

let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    console.log(`[embed] loading model ${MODEL_NAME} (first run may download ~110MB)...`);
    extractorPromise = pipeline("feature-extraction", MODEL_NAME, {
      quantized: true,
    }).then((ext) => {
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

  const [batchSize, dim] = output.dims;
  if (dim !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding dim mismatch: got ${dim}, expected ${EMBEDDING_DIMENSIONS}`);
  }
  const flat = output.data;
  const result = new Array(batchSize);
  for (let i = 0; i < batchSize; i++) {
    result[i] = Array.from(flat.slice(i * dim, (i + 1) * dim));
  }
  return result;
}
