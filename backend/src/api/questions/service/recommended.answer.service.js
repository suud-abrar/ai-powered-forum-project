// src/api/questions/service/recommend.answer.service.js
import { GoogleGenAI } from "@google/genai";
import { safeExecute } from "../../../../db/config.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function recommendAnswerService(questionHash) {
  // 1. Fetch the question
  const questionRows = await safeExecute(
    `SELECT q.question_id, q.title, q.content
     FROM questions q
     WHERE q.question_hash = ?`,
    [questionHash],
  );
  console.log("questionRows:", questionRows);

  if (!questionRows.length) {
    return null;
  }

  const question = questionRows[0];

  // 2. Fetch all answers
  const answerRows = await safeExecute(
    `SELECT a.answer_id, a.content, u.first_name, u.last_name
     FROM answers a
     JOIN users u ON a.user_id = u.user_id
     WHERE a.question_id = ?
     ORDER BY a.created_at ASC`,
    [question.question_id],
  );
  console.log("answerRows:", answerRows);

  // 3. Edge cases — return early without calling AI
  if (answerRows.length === 0) {
    return {
      recommendedAnswerId: null,
      confidence: null,
      reason: "No answers to evaluate.",
    };
  }

  if (answerRows.length === 1) {
    return {
      recommendedAnswerId: answerRows[0].answer_id,
      confidence: 100,
      reason: "Only one answer available.",
    };
  }

  // 4. Build prompt
  const answersText = answerRows
    .map((a, i) => `Answer #${i + 1} (ID: ${a.answer_id}):\n${a.content}`)
    .join("\n\n---\n\n");

  const prompt = `
You are evaluating community answers to a forum question.

Question Title: "${question.title}"
Question Body: "${question.content}"

Here are the answers:

${answersText}

Pick the single best answer based on correctness, completeness, clarity, and helpfulness.

Respond ONLY with valid JSON in this format:
{
  "recommendedAnswerId": number,
  "confidence": number,
  "reason": "one sentence explanation"
}
`;

  // 5. Call Gemini
  const geminiResult = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  // 6. Parse and return data
  const text = geminiResult.text?.trim() || "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return parsed;
}
