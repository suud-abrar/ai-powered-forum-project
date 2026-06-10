import { body } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";
//import { content } from './../../../../../frontend/node_modules/micromark/lib/initialize/content';


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
