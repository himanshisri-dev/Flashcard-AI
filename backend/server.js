import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import { ensureCollection } from "./src/services/qdrant.service.js";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
import authRoutes from "./src/routes/auth.routes.js";
import pdfRoutes from "./src/routes/pdf.routes.js";
import flashcardRoutes from "./src/routes/flashcard.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
if (env.isDev) app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: env.nodeEnv, uptime: process.uptime() });
});

app.use("/api/auth", authRoutes);
app.use("/api/pdfs", pdfRoutes);
app.use("/api/flashcards", flashcardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    await ensureCollection();
    app.listen(env.port, () => {
      console.log(`[server] http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error("[server] failed to start:", err);
    process.exit(1);
  }
}

start();
