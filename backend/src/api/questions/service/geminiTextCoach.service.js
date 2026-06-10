import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeExecute } from "../../../../db/config.js"; // ← import safeExecute instead of db

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const assessAnswerAgainstQuestionService = async (questionHash, answerText) => {
  // 1. Fetch question from DB using safeExecute
  const rows = await safeExecute(
    "SELECT title, content FROM questions WHERE question_hash = ? LIMIT 1",
    [questionHash],
  );

  if (!rows || rows.length === 0) {
    return null; // controller handles 404
  }

  const question = rows[0];

  // 2. Build prompt
  const prompt = `
You are an expert evaluator. A user has written a draft answer to a question.
Evaluate how well the answer addresses the question.

Question Title: ${question.title}
Question Content: ${question.content}

Draft Answer: ${answerText}

Respond ONLY with a valid JSON object in this exact format, no extra text:
{
  "level": "strong" | "partial" | "weak",
  "note": "A concise explanation of why the answer received this rating"
}
`;

  // 3. Call Gemini
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_TEXT_MODEL || "gemini-1.5-pro",
  });
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // 4. Parse response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!["strong", "partial", "weak"].includes(parsed.level)) {
    throw new Error("Invalid level value returned from Gemini");
  }

  return parsed; // { level, note }
};

export { assessAnswerAgainstQuestionService };

export const generateQuestionDraftCoachService = async (title, content) => {
  // 1. Build prompt
  const prompt = `
You are an expert programming forum coach. A user is drafting a question to post on a developer forum.
Review the draft and provide actionable tips to improve its clarity, formatting, and completeness.

${title ? `Question Title: ${title}` : "No title provided."}
Question Content: ${content}

Respond ONLY with a valid JSON object in this exact format, no extra text:
{
  "tips": [
    "tip one",
    "tip two",
    "tip three"
  ]
}
`;

  // 2. Call Gemini
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_TEXT_MODEL,
  });
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // 3. Parse response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(parsed.tips)) {
    throw new Error("Invalid response structure from Gemini");
  }

  return parsed; // { tips: [...] }
};