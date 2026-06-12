// backend/src/api/answers/answer.service.js
import { safeExecute } from "../../../../db/config.js";
import { NotFoundError, BadRequestError } from "../../../utils/errors/index.js";

// ─────────────────────────────────────────────
// fetchQuestionOwner(questionId)
// ─────────────────────────────────────────────
async function fetchQuestionOwner(questionId) {
  const rows = await safeExecute(
    `SELECT user_id
     FROM   questions
     WHERE  question_id = ?
     LIMIT 1`,
    [questionId],
  );

  if (rows.length === 0) {
    throw new NotFoundError("Question not found.");
  }

  return rows[0].user_id;
}

// ─────────────────────────────────────────────
// insertAnswer(questionId, userId, content)
// ─────────────────────────────────────────────
async function insertAnswer(questionId, userId, content) {
  const result = await safeExecute(
    `INSERT INTO answers (question_id, user_id, content)
     VALUES (?, ?, ?)`,
    [questionId, userId, content],
  );

  // result.insertId is the auto-generated answer_id
  return result.insertId;
}

// ─────────────────────────────────────────────
// fetchAnswerById(answerId)

async function fetchAnswerById(answerId) {
  const rows = await safeExecute(
    `SELECT
       a.answer_id    AS id,
       a.question_id  AS questionId,
       a.content,
       a.created_at   AS createdAt,
       a.updated_at   AS updatedAt,
       u.user_id      AS authorId,
       u.first_name   AS firstName,
       u.last_name    AS lastName
     FROM      answers a
     LEFT JOIN users   u ON u.user_id = a.user_id
     WHERE a.answer_id = ?
     LIMIT 1`,
    [answerId],
  );

  return rows[0];
}

// ─────────────────────────────────────────────
// createAnswerService({ questionId, userId, content })
//
// Orchestrates the full create answer pipeline:
//   1. Verify question exists → get owner
//   2. Check user isn't answering their own question
//   3. Insert the answer
//   4. Fetch and return the created answer with author info
// ─────────────────────────────────────────────
async function createAnswerService({ questionId, userId, content }) {
  // Step 1 — verify question exists and get its owner
  const questionOwnerId = await fetchQuestionOwner(questionId);

  // Step 2 — ownership check

  if (questionOwnerId === userId) {
    throw new BadRequestError("You cannot answer your own question.");
  }

  // Step 3 — insert the answer
  const answerId = await insertAnswer(questionId, userId, content);

  // Step 4 — fetch the full answer details
  const answer = await fetchAnswerById(answerId);

  // Step 5 — shape the response
  return {
    id: answer.id,
    questionId: answer.questionId,
    content: answer.content,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
    author: {
      id: answer.authorId,
      firstName: answer.firstName,
      lastName: answer.lastName,
    },
  };
}

export { createAnswerService };
