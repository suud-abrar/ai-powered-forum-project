import Joi from "joi";

export const documentIdParamValidation = (req, res, next) => {
  const schema = Joi.object({
    documentId: Joi.number().integer().positive().required().messages({
      "number.base": "documentId must be a number",
      "number.integer": "documentId must be an integer",
      "number.positive": "documentId must be a positive number",
      "any.required": "documentId is required",
    }),
  });

  const { error } = schema.validate(req.params);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next();
};
