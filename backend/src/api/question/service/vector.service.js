import { GoogleGenAI } from "@google/genai";
import { safeExecute } from "../../../../db/config.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const normalizeQuestionText = (text) => {
  return text.trim().replace(/\s+/g, " ");
};

export const generateQuestionEmbedding = async (text) => {
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
    taskType: "RETRIEVAL_DOCUMENT",
  });

  return response.embeddings[0].values;
};

export const storeQuestionVector = async ({
  questionId,
  sourceText,
  embedding,
  status = "ready",
}) => {
  await safeExecute(
    `
      INSERT INTO question_vectors
      (
        question_id,
        source_text,
        embedding,
        status
      )
      VALUES (?, ?, ?, ?)
    `,
    [questionId, sourceText, JSON.stringify(embedding), status],
  );
};
