import crypto from "crypto";
import { safeExecute } from "../../../../db/config.js";
import {
  normalizeQuestionText,
  generateQuestionEmbedding,
  storeQuestionVector,
} from "./vector.service.js";
import { embedForumPost } from "../../forum-chat/service/forum-post-vector.helper.js";
import { moderateWithGemini } from "../../moderation/service/moderation.service.js";

const generateQuestionHash = () => crypto.randomBytes(8).toString("hex");

export const createQuestionService = async ({ title, content, userId }) => {
  const questionHash = generateQuestionHash();

  const aiResult = await moderateWithGemini(`${title}\n\n${content}`);

  let moderationStatus = "approved";

  if (aiResult.status === "flagged") {
    moderationStatus = "pending";
  }

  const result = await safeExecute(
    `INSERT INTO questions (
        question_hash,
        title,
        content,
        user_id,
        moderation_status,
        moderation_reason
     )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      questionHash,
      title,
      content,
      userId,
      String(moderationStatus),
      aiResult.reason || "AI Auto-Approved",
    ],
  );

  const questionId = result.insertId;

  // embeddings
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

  await embedForumPost("question", questionId, `${title}\n\n${content}`);
 
  return {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
    moderationStatus,
    aiResult,
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
  u.last_name,
  (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.question_id) AS answer_count
FROM questions q
JOIN users u ON u.user_id = q.user_id
WHERE 1=1
`;

  const params = [];

  // Search by keyword
  if (search) {
    sql += `
      AND (
        q.title LIKE ?
        OR q.content LIKE ?
      )
    `;

    params.push(`%${search}%`);
    params.push(`%${search}%`);
  }

  // Mine filter
  if (mine === "true") {
    sql += ` AND q.user_id = ? `;
    params.push(userId);
  }

  sql += ` ORDER BY q.created_at DESC`;

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
