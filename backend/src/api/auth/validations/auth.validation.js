import Joi from "joi";
import { body } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

export const registerValidation = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .withMessage("First name must be a string")
    .isLength({ min: 3 })
    .withMessage("First name must be at least 3 characters long"),
  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be a string")
    .isLength({ min: 3 })
    .withMessage("Last name must be at least 3 characters long"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  validationErrorHandler,
];

export const loginValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),

  validationErrorHandler,
];

/**
 * Validation schema for Google OAuth
 */
const googleAuthSchema = Joi.object({
  idToken: Joi.string().required().messages({
    "string.empty": "Google ID token is required.",
    "any.required": "Google ID token is required.",
  }),
});

/**
 * Middleware to validate Google auth request
 */
export const validateGoogleAuth = (req, res, next) => {
  const { error, value } = googleAuthSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  req.body = value;
  next();
};
