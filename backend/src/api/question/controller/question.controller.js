import { StatusCodes } from "http-status-codes";
import { createQuestionService } from "../service/question.service.js";

export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    const result = await createQuestionService({
      title,
      content,
      userId: req.user.id, //authenticated user 
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Question created successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
