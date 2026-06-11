// src/api/questions/routes/question.routes.js
import { Router } from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

// ── Validations ───────────────────────────────
import {
  validateQuestionHash,
  validateAnswerFitBody,
  generateQuestionDraftCoachValidation,
} from "../validations/question.validation.js";
import { searchQuestionsValidation,createQuestionValidation } from "../validation/question.validation.js";

// ── Controllers ───────────────────────────────
import {
  createQuestionController,
  listQuestionsController,
  getQuestionDetailsController,
  assessAnswerAgainstQuestionController,
  generateQuestionDraftCoachController,
  searchQuestionsSemanticController,
} from "../controller/question.controller.js";
const router = Router();

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
  authenticateUser,
  validateQuestionHash,
  validateAnswerFitBody,
  validationErrorHandler,
  assessAnswerAgainstQuestionController,
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
router.get(
  "/", 
  authenticateUser, 
  listQuestionsController
);

router.get(
  "/:questionHash", 
  authenticateUser,
  getQuestionDetailsController
);


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

export default router;
