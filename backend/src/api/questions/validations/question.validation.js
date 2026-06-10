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
