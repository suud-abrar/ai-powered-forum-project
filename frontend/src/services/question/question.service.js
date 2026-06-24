/**
 * question.service.js
 * All API calls related to questions and answers.
 * Import this in Dashboard, PostQuestion, QuestionDetail, MyQuestions.
 */

import { apiClient } from "../core/api.client";

/**
 * GET /api/questions
 * Fetch all questions, optionally filtered by keyword search.
 * @param {{ search?: string, mine?: boolean, limit?: number, offset?: number }} params
 */
export async function getQuestions({
  search,
  mine,
  limit = 100,
  offset = 0,
} = {}) {
  const res = await apiClient.get("/api/questions", {
    params: {
      ...(search ? {search: search } : {}),
      ...(mine !== undefined ? { mine } : {}),
      limit,
      offset,
    },
  });
  return res.data;
}

/**
 * GET /api/questions/search
 * Semantic (AI vector) search for questions.
 * @param {string} query
 * @param {{ limit?: number, offset?: number }} opts
 */
export async function searchQuestionsSemantic(
  query,
  { limit = 100, offset = 0 } = {},
) {
  const res = await apiClient.get("/api/questions/search", {
    params: {
      query: query, // ← was 'q: query', must be 'query' to match backend
      limit,
      offset,
    },
  });
  return res.data;
}

/**
 * GET /api/questions/:questionHash
 * Fetch a single question and all its answers.
 * @param {string} questionHash
 */
export async function getQuestion(questionHash) {
  const res = await apiClient.get(`/api/questions/${questionHash}`);
  return res.data;
}

/**
 * POST /api/questions
 * Create a new question.
 * @param {{ title: string, content: string }} data
 */
export async function createQuestion(data) {
  const res = await apiClient.post("/api/questions", data);
  return res.data;
}

/**
 * POST /api/questions/draft-coach
 * Get AI feedback on a question draft.
 * @param {{ title: string, content: string }} data
 */
export async function generateQuestionDraftCoach(data) {
  const res = await apiClient.post("/api/questions/draft-coach", data);
  return res.data;
}

/**
 * GET /api/questions/:questionHash/similar
 * Get semantically similar questions based on an existing question's vector.
 * @param {string} questionHash
 */
export async function getSimilarQuestions(
  questionHash,
  { k = 5, threshold = 0.5 } = {},
) {
  const response = await apiClient.get(
    `/api/questions/${questionHash}/similar`,
    {
      params: { k, threshold },
    },
  );
  return response.data.data;
}

/**
 * POST /api/questions/:questionHash/answer-fit
 * Evaluate how well a draft answer addresses the question.
 * @param {string} questionHash
 * @param {{ content: string }} data
 */
export async function evaluateAnswerFit(questionHash, data) {
  const res = await apiClient.post(
    `/api/questions/${questionHash}/answer-fit`,
    data,
  );
  return res.data;
}

/**
 * POST /api/answers
 * Submit an answer to a question.
 * @param {{ questionHash: string, content: string }} data
 */
export async function createAnswer(data) {
  const res = await apiClient.post("/api/answers", data);
  return res.data;
}

/**Get delails of single question by questionHash */

// frontend/src/services/question/question.service.js
// Add these functions to your existing question.service.js
/**
 * GET /api/questions/:questionHash
 * Fetches a single question with its answers.
 * @param {string} questionHash
 */
export async function getSingleQuestion(questionHash) {
  const response = await apiClient.get(`/api/questions/${questionHash}`);
  return response.data.data;
}

/**
 * POST /api/questions/:questionHash/answer-fit
 * Evaluates how well an answer fits the question using AI.
 * @param {string} questionHash
 * @param {string} answerText
 * @returns {{ level: "strong"|"partial"|"weak", note: string }}
 */
export async function assessAnswerFit(questionHash, answerText) {
  const response = await apiClient.post(
    `/api/questions/${questionHash}/answer-fit`,
    {
      answerText,
    },
  );
  return response.data.data;
}

//_____ Reconended answer________________________________________________________________________

export async function getRecommendedAnswer(questionHash) {
  const { data } = await apiClient.get(
    `/api/questions/${questionHash}/recommend-answer`,
  );
  return data.data; 
}
