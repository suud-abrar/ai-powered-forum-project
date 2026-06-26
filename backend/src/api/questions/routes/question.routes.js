// src/api/questions/routes/question.routes.js
import { Router } from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

// ── Validations ───────────────────────────────
import {
  similarQuestionsValidation,
  searchQuestionsValidation,
  createQuestionValidation,
  validateQuestionHash,
  validateAnswerFitBody,
  generateQuestionDraftCoachValidation,
} from "../validations/question.validation.js";

// ── Controllers ───────────────────────────────
import {
  createQuestionController,
  listQuestionsController,
  getQuestionDetailsController,
  assessAnswerAgainstQuestionController,
  generateQuestionDraftCoachController,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
  recommendAnswerController,
} from "../controller/question.controller.js";
import { generateAnswerSummaryController } from "../controller/summarizer.controller.js";

const router = Router();

// ── T-11: Semantic Search ─────────────────────

// GET /api/questions/search
// IMPORTANT: static route must come BEFORE dynamic /:questionHash routes
router.get(
  "/search",
  authenticateUser,
  searchQuestionsValidation,
  validationErrorHandler,
  searchQuestionsSemanticController,
);

// ── T-11: Similar Questions by Hash ─────────────

router.get(
  "/:questionHash/similar",
  authenticateUser,
  similarQuestionsValidation,
  validationErrorHandler,
  getSimilarQuestionsController,
);

// GET /api/questions/:questionHash/recommend-answer
router.get(
  "/:questionHash/recommend-answer",
  authenticateUser,
  validateQuestionHash,
  recommendAnswerController,
);

// ── Zaida ───────────────────────────
// POST /api/questions
router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);
// Get/api/questions
router.get("/", authenticateUser, listQuestionsController);

router.get("/:questionHash", authenticateUser, getQuestionDetailsController);

// ── Leader's routes ───────────────────────────

// POST /api/questions/draft-coach
router.post(
  "/draft-coach",
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,
);

// POST /api/questions/:questionHash/answer-fit
router.post(
  "/:questionHash/answer-fit",
  authenticateUser, // 1. verify bearer token
  validateQuestionHash, // 2. validate :questionHash param
  validateAnswerFitBody, // 3. validate request body
  assessAnswerAgainstQuestionController, // 4. handle request
);

// NEW: Answer summarizer route
router.get(
  "/:questionHash/answer-summary",
  validateQuestionHash,
  generateAnswerSummaryController,
);

export default router;
