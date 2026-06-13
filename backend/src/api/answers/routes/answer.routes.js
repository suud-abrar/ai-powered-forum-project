// backend/src/api/answers/answer.routes.js
import { Router } from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";
import { createAnswerValidation } from "../validation/answer.validation.js";
import { createAnswerController } from "../controller/answer.controller.js";

const router = Router();

// POST /api/answers
router.post(
  "/",
  authenticateUser,
  createAnswerValidation,
  validationErrorHandler,
  createAnswerController,
);

export default router;
