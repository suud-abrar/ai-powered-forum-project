import {
  assessAnswerAgainstQuestionService,
  generateQuestionDraftCoachService,
} from "../service/geminiTextCoach.service.js";

export const assessAnswerAgainstQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    const result = await assessAnswerAgainstQuestionService(
      questionHash,
      answerText,
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Answer fit assessed",
      data: {
        level: result.level,
        note: result.note,
      },
    });
  } catch (error) {
    next(error); // handled by error-handler.js middleware
  }
};

export const generateQuestionDraftCoachController = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const result = await generateQuestionDraftCoachService(title, content);

    return res.status(200).json({
      success: true,
      message: "Draft suggestions generated",
      data: {
        tips: result.tips,
      },
    });
  } catch (error) {
    next(error);
  }
};
