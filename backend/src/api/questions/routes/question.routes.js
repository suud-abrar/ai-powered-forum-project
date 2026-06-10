import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  validateQuestionHash,
  validateAnswerFitBody,
  generateQuestionDraftCoachValidation,
} from "../validations/question.validation.js";
import {
  assessAnswerAgainstQuestionController,
  generateQuestionDraftCoachController,
} from "../controller/question.controller.js";

const router = express.Router();

router.post(
  "/draft-coach",
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController,
);

router.post(
  "/:questionHash/answer-fit",
  authenticateUser, // 1. verify bearer token
  validateQuestionHash, // 2. validate :questionHash param
  validateAnswerFitBody, // 3. validate request body
  assessAnswerAgainstQuestionController, // 4. handle request
);

export default router;
