import { generateAnswerSummaryService } from "../service/summarizer.service.js";
import { NotFoundError } from "../../../utils/errors/index.js";

export const generateAnswerSummaryController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    const result = await generateAnswerSummaryService(questionHash);

    return res.status(200).json({
      success: true,
      message: "Answer summary generated successfully",
      data: {
        summary: result.summary,
        answerCount: result.answerCount,
        questionTitle: result.questionTitle,
      },
    });
  } catch (error) {
    if (error.message === "Question not found") {
      return next(new NotFoundError("Question not found"));
    }
    next(error);
  }
};
