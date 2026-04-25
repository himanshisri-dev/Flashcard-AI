import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  updateFlashcard,
  deleteFlashcard,
} from "../controllers/flashcard.controller.js";

const router = Router();

router.use(authenticate);

router.patch("/:id", asyncHandler(updateFlashcard));
router.delete("/:id", asyncHandler(deleteFlashcard));

export default router;
