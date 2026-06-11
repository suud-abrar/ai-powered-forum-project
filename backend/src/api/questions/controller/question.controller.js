import { StatusCodes } from "http-status-codes";
// src/api/questions/controller/question.controller.js
import { searchQuestionsSemanticService } from "../service/questions.service.js";
import {
  createQuestionService,
  listQuestionsService,
  getQuestionDetailsService,
} from "../service/question.service.js";

// ── T-11: Semantic Search ─────────────────────
export async function searchQuestionsSemanticController(req, res, next) {
  try {
    const { query, k, threshold } = req.query;

    const { results, meta } = await searchQuestionsSemanticService({
      query,
      k,
      threshold,
    });

    return res.status(200).json({
      success: true,
      message: "Semantic search completed successfully",
      data: results,
      meta,
    });
  } catch (error) {
    next(error);
  }
}

// ── Leader: Assess Answer Against Question ────
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
// ── Leader: Generate Question Draft Coach ─────
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

// ── Zaida ─────

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

export const listQuestionsController = async (req, res, next) => {
  try {
    const { search, mine } = req.query;

    const questions = await listQuestionsService({
      search,
      mine,
      userId: req.user.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Questions fetched successfully",
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuestionDetailsController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    const data = await getQuestionDetailsService(questionHash);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Question details fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};