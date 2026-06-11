// src/api/questions/question.validation.js
import { query } from "express-validator";

const searchQuestionsValidation = [
  query("query")
    .trim()
    .exists({ checkFalsy: true })
    .withMessage("Search query is required")
    .isLength({ min: 5 })
    .withMessage("Search query must be at least 5 characters"),

  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be an integer between 1 and 20")
    .toInt(),

  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("Threshold must be a number between 0 and 1")
    .toFloat(),
];

export { searchQuestionsValidation };
