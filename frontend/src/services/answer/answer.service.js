// frontend/src/services/answer/answer.service.js
import { apiClient } from "../../services/core/api.client";

/**
 * POST /api/answers
 * Posts a new answer to a question.
 * @param {number} questionId
 * @param {string} content
 */
export async function postAnswer(questionId, content) {
  const response = await apiClient.post("/api/answers", {
    questionId,
    content,
  });
  return response.data.data;
}
