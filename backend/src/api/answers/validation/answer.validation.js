// backend/src/api/answers/answer.validation.js
import { body } from "express-validator";

// ─────────────────────────────────────────────
// Rule of thumb:
//   GET  + URL path      → param()   /:questionHash
//   GET  + query string  → query()   ?k=5
//   POST + request body  → body()    { questionId, content }
// ─────────────────────────────────────────────
const createAnswerValidation = [
  body("questionId")
    .exists({ checkFalsy: true })
    .withMessage("Question ID is required")
    // ─────────────────────────────────────────
    // isInt() ensures it's a valid integer.
    // toInt() coerces the string "1" → number 1.
    // Without toInt(), "1" !== 1 in strict comparisons
    // and your SQL query may behave unexpectedly.
    // ─────────────────────────────────────────
    .isInt({ min: 1 })
    .withMessage("Question ID must be a positive integer")
    .toInt(),

  body("content")
    .trim()
    .exists({ checkFalsy: true })
    .withMessage("Answer content is required")
    .isLength({ min: 20 })
    .withMessage("Answer content must be at least 20 characters"),
];

export { createAnswerValidation };
