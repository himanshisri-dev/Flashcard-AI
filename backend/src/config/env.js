import dotenv from "dotenv";

dotenv.config();

const required = [
  "MONGO_URI",
  "JWT_SECRET",
  "GROQ_API_KEY",
  "JINA_API_KEY",
  "QDRANT_URL",
  "QDRANT_COLLECTION",
];
// EMBEDDING_MODEL is legacy — embeddings now run locally via Transformers.js
// (see embeddings.service.js). The env var is kept optional for backward
// compatibility in case of switching back to Gemini embeddings.

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required env vars: ${missing.join(", ")}`);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: "7d",
  groqApiKey: process.env.GROQ_API_KEY,
  jinaApiKey: process.env.JINA_API_KEY,
  qdrantUrl: process.env.QDRANT_URL,
  qdrantCollection: process.env.QDRANT_COLLECTION,
  qdrantApiKey: process.env.QDRANT_API_KEY || "",
  embeddingModel: process.env.EMBEDDING_MODEL,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") !== "production",
};
