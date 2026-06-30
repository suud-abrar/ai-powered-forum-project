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
      ...(search ? { search } : {}),
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
      query, // Matches backend expectation
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
  // NOTE: If your backend wraps the response payload inside a "data" object,
  // change this to: return res.data.data;
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
  const res = await apiClient.get(`/api/questions/${questionHash}/similar`, {
    params: { k, threshold },
  });
  return res.data.data;
}

/**
 * POST /api/questions/:questionHash/answer-fit
 * Evaluate how well a draft answer addresses the question.
 * @param {string} questionHash
 * @param {{ content: string } | string} answerData - Accepts either an object or raw string payload depending on backend setup
 */
export async function assessAnswerFit(questionHash, answerData) {
  // If you pass a raw string, we map it to the body object expected by the backend
  const payload =
    typeof answerData === "string" ? { content: answerData } : answerData;

  const res = await apiClient.post(
    `/api/questions/${questionHash}/answer-fit`,
    payload,
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

/**
 * GET /api/questions/:questionHash/recommend-answer
 * Fetch a recommended AI generated answer for a question thread.
 * @param {string} questionHash
 */
export async function getRecommendedAnswer(questionHash) {
  const res = await apiClient.get(
    `/api/questions/${questionHash}/recommend-answer`,
  );
  return res.data.data;
}


export async function getAnswerSummary(questionHash) {
  const res = await apiClient.get(`/api/questions/${questionHash}/answer-summary`);
  return res.data.data ?? res.data;
}
