// src/api/questions/question.service.js
import { GoogleGenAI } from "@google/genai";
import { db, safeExecute } from "../../../../db/config.js";
import { ServiceUnavailableError } from "../../../utils/errors/index.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const RECOMMEND_THRESHOLD = parseFloat(process.env.RECOMMEND_THRESHOLD) || 0.75;
const DEFAULT_K = parseInt(process.env.RECOMMEND_K, 10) || 5;

function cosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vector dimension mismatch: ${vectorA.length} vs ${vectorB.length}`,
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

async function embedQuery(queryText) {
  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: queryText,
      config: { taskType: "RETRIEVAL_QUERY" },
    });

    return response.embeddings[0].values;
  } catch (error) {
    console.error("[embedQuery] Gemini API error:", error.message);
    throw new ServiceUnavailableError(
      "Embedding service is temporarily unavailable. Please try again later.",
    );
  }
}
// ─────────────────────────────────────────────
// fetchReadyVectors()
//
// No user-supplied parameters → use db.query() directly.
// safeExecute would require us to pass params, which we don't have.
// The status='ready' value is a hardcoded literal in OUR SQL,
// not user input, so there is no injection risk here.
// ─────────────────────────────────────────────
async function fetchReadyVectors() {
  const [rows] = await db.query(
    `SELECT question_id, embedding
     FROM   question_vectors
     WHERE  status = 'ready'`,
  );

  return rows.map((row) => ({
    questionId: row.question_id,
    embedding:
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding,
  }));
}

// ─────────────────────────────────────────────
// fetchQuestionsByIds(questionIds)
//
// Has parameters (the IDs array) → use safeExecute.
// safeExecute validates params before executing, which is
// exactly what we want for externally-derived values.
//
// TEACHING NOTE — dynamic placeholders:
// We build "?, ?, ?" — one placeholder per ID.
// MySQL's prepared statement protocol requires the placeholder
// count to exactly match the params array length.
// Passing the array directly as params works with mysql2:
//   safeExecute(sql, questionIds) ✓
// ─────────────────────────────────────────────
async function fetchQuestionsByIds(questionIds) {
  if (questionIds.length === 0) return [];

  const placeholders = questionIds.map(() => "?").join(", ");

  const rows = await safeExecute(
    `SELECT
       q.question_id                AS id,
       q.question_hash              AS questionHash,
       q.title,
       q.content,
       q.created_at                 AS createdAt,
       q.updated_at                 AS updatedAt,
       COUNT(a.answer_id)           AS answerCount,
       u.user_id                    AS authorId,
       u.first_name                 AS firstName,
       u.last_name                  AS lastName
     FROM      questions q
     LEFT JOIN answers a ON  a.question_id = q.question_id
     LEFT JOIN users   u ON  u.user_id     = q.user_id
     WHERE q.question_id IN (${placeholders})
     GROUP BY
       q.question_id,
       q.question_hash,
       q.title,
       q.content,
       q.created_at,
       q.updated_at,
       u.user_id,
       u.first_name,
       u.last_name`,
    questionIds, // safeExecute wraps db.execute() — array params work directly
  );

  return rows;
}

// ─────────────────────────────────────────────
// searchQuestionsSemanticService({ query, k, threshold })
// Orchestrator — calls helpers in sequence, shapes the response.
// ─────────────────────────────────────────────
async function searchQuestionsSemanticService({ query, k, threshold }) {
  const limit = k ?? DEFAULT_K;
  const minScore = threshold ?? RECOMMEND_THRESHOLD;

  const queryVector = await embedQuery(query);
  const storedVectors = await fetchReadyVectors();

  const scored = storedVectors.map(({ questionId, embedding }) => ({
    questionId,
    score: cosineSimilarity(queryVector, embedding),
  }));

  const topMatches = scored
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const meta = {
    total: topMatches.length,
    k: limit,
    threshold: minScore,
    query,
    questionHash: null,
  };

  if (topMatches.length === 0) return { results: [], meta };

  const matchedIds = topMatches.map(({ questionId }) => questionId);
  const questions = await fetchQuestionsByIds(matchedIds);

  const scoreMap = new Map(
    topMatches.map(({ questionId, score }) => [questionId, score]),
  );

  const results = questions
    .map((q) => ({
      id: q.id,
      questionHash: q.questionHash,
      title: q.title,
      content: q.content,
      answerCount: Number(q.answerCount),
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      author: {
        id: q.authorId,
        firstName: q.firstName,
        lastName: q.lastName,
      },
      score: parseFloat(scoreMap.get(q.id).toFixed(6)),
    }))
    .sort((a, b) => b.score - a.score);

  return { results, meta: { ...meta, total: results.length } };
}

export { searchQuestionsSemanticService };
