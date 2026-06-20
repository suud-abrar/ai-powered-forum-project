import crypto from "crypto";
import { safeExecute } from "../../../../db/config.js";
import {
  normalizeQuestionText,
  generateQuestionEmbedding,
  storeQuestionVector,
} from "./vector.service.js";

const generateQuestionHash = () => crypto.randomBytes(8).toString("hex");

export const createQuestionService = async ({ title, content, userId }) => {
  const questionHash = generateQuestionHash();

  const result = await safeExecute(
    `INSERT INTO questions (question_hash, title, content, user_id)
     VALUES (?, ?, ?, ?)`,
    [questionHash, title, content, userId],
  );

  const questionId = result.insertId;

  const sourceText = normalizeQuestionText(title);

  try {
    const embedding = await generateQuestionEmbedding(sourceText);
    await storeQuestionVector({
      questionId,
      sourceText,
      embedding,
      status: "ready",
    });
  } catch (err) {
    await storeQuestionVector({
      questionId,
      sourceText,
      embedding: [],
      status: "failed",
    });
  }

  return {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };
};

export const listQuestionsService = async ({ search, mine, userId }) => {
  let sql = `
  SELECT
    q.question_id,
    q.question_hash,
    q.title,
    q.content,
    q.user_id,
    q.created_at,
    u.first_name,
    u.last_name
  FROM questions q
  JOIN users u ON q.user_id = u.user_id
  WHERE 1=1
`;

  const params = [];

  // Search by keyword
  if (search) {
    sql += `
      AND (
        title LIKE ?
        OR content LIKE ?
      )
    `;

    params.push(`%${search}%`);
    params.push(`%${search}%`);
  }

  // Mine filter
  if (mine === "true") {
    sql += ` AND user_id = ? `;
    params.push(userId);
  }

  sql += ` ORDER BY created_at DESC`;

  const questions = await safeExecute(sql, params);

  return questions;
};

export const getQuestionDetailsService = async (questionHash) => {
  // 1. Get question + question author info
  const questionQuery = `
    SELECT
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.user_id,
      q.created_at,
      u.first_name,
      u.last_name
    FROM questions q
    JOIN users u ON u.user_id = q.user_id
    WHERE q.question_hash = ?
  `;

  const questionResult = await safeExecute(questionQuery, [questionHash]);

  if (!questionResult || questionResult.length === 0) {
    throw new Error("Question not found");
  }

  const question = questionResult[0];

  // 2. Get answers + answer author info
  const answersQuery = `
    SELECT
      a.answer_id,
      a.content,
      a.user_id,
      a.created_at,
      u.first_name,
      u.last_name
    FROM answers a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.question_id = ?
    ORDER BY a.created_at DESC
  `;

  const answers = await safeExecute(answersQuery, [question.question_id]);

  return {
    ...question,
    answers,
  };
};
