import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeExecute } from "../../../../db/config.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const generateAnswerSummaryService = async (questionHash) => {
  // Step 1: Fetch question details
  const questionRows = await safeExecute(
    "SELECT question_id, title, content FROM questions WHERE question_hash = ? LIMIT 1",
    [questionHash],
  );

  if (questionRows.length === 0) {
    throw new Error("Question not found");
  }
  
  const question = questionRows[0];

  // Step 2: Fetch all answers for this question
  const answers = await safeExecute(
    `SELECT a.answer_id, a.content, a.created_at, u.first_name, u.last_name
     FROM answers a
     JOIN users u ON a.user_id = u.user_id
     WHERE a.question_id = ?
     ORDER BY a.created_at DESC`,
    [question.question_id],
  );
  if (answers.length === 0) {
    return {
      summary: "No answers yet. Be the first to answer!",
      answerCount: 0,
    };
  }

  // Step 3: Build the prompt with all answers
  const answersText = answers
    .map(
      (ans, idx) =>
        `Answer ${idx + 1} (by ${ans.first_name} ${ans.last_name}):\n${ans.content}`,
    )
    .join("\n\n---\n\n");

  const prompt = `You are a technical forum expert. Summarize the key points from these answers about: "${question.title}"

Question: ${question.content}

Answers:
${answersText}

Provide a concise bulleted summary (3-6 bullet points) of:
1. The main consensus/solution
2. Key considerations or trade-offs mentioned
3. Any areas of disagreement or alternative approaches

Format as bullet points, keep each point under 20 words.`;

  // Step 4: Call Gemini
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash-lite",
  });

  const result = await model.generateContent(prompt);
  const summary = result.response.text();

  return {
    summary,
    answerCount: answers.length,
    questionTitle: question.title,
  };
};
