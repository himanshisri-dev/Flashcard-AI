import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import { uploadPdf as uploadMiddleware } from "../middleware/upload.js";
import {
  uploadPdf,
  listPdfs,
  getPdf,
  deletePdf,
  reindexPdf,
} from "../controllers/pdf.controller.js";
import { listFlashcardsByPdf } from "../controllers/flashcard.controller.js";
import {
  getChatHistory,
  postChatMessage,
  clearChatHistory,
} from "../controllers/chat.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(listPdfs));
router.post("/", uploadMiddleware.single("file"), asyncHandler(uploadPdf));
router.get("/:id", asyncHandler(getPdf));
router.delete("/:id", asyncHandler(deletePdf));
router.post("/:id/reindex", asyncHandler(reindexPdf));

router.get("/:pdfId/flashcards", asyncHandler(listFlashcardsByPdf));

router.get("/:id/chat", asyncHandler(getChatHistory));
router.post("/:id/chat", asyncHandler(postChatMessage));
router.delete("/:id/chat", asyncHandler(clearChatHistory));

export default router;
