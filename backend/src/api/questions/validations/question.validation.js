import { body } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";
//import { content } from './../../../../../frontend/node_modules/micromark/lib/initialize/content';

// src/api/questions/question.validation.js
import { query, param } from "express-validator";
import Joi from "joi";

const validateQuestionHash = (req, res, next) => {
  const schema = Joi.object({
    questionHash: Joi.string()
      .length(16)
      .pattern(/^[a-fA-F0-9]+$/)
      .required()
      .messages({
        "string.length": "questionHash must be exactly 16 characters",
        "string.pattern.base": "questionHash must be a valid hex string",
      }),
  });

  const { error } = schema.validate(req.params);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next();
};

const validateAnswerFitBody = (req, res, next) => {
  const schema = Joi.object({
    answerText: Joi.string().min(20).required().messages({
      "string.min": "answerText must be at least 20 characters",
      "any.required": "answerText is required",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next();
};

export { validateQuestionHash, validateAnswerFitBody };

export const generateQuestionDraftCoachValidation = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().optional(),
    content: Joi.string().required().messages({
      "any.required": "content is required",
      "string.empty": "content cannot be empty",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next();
};

export const createQuestionValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Title must be between 5 and 255 characters")
    .trim(),

  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters long")
    .trim(),
  validationErrorHandler,
];

// ── T-11: Semantic Search ─────────────────────

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

const similarQuestionsValidation = [
  param("questionHash")
    .trim()
    .exists({ checkFalsy: true })
    .withMessage("Question hash is required")
    .isHexadecimal()
    .withMessage("Question hash must be a valid hexadecimal string")
    .isLength({ min: 16, max: 16 })
    .withMessage("Question hash must be exactly 16 characters"),

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

export { searchQuestionsValidation, similarQuestionsValidation };