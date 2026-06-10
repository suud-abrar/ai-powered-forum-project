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
