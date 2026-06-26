import { GoogleGenAI } from "@google/genai";
import { db } from "../../../../db/config.js";


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * AI Moderation Engine
 * Returns: { status: "approved" | "flagged", reason }
 */
export async function moderateWithGemini(text) {
  try {
    const prompt = `
You are an automated backend content moderation system for a technical programming forum.
Analyze the incoming text wrapped inside the <forum_post> tags below.

Rules:
- SET status to "approved" if the text contains coding questions, software engineering concepts, database design, debugging help, framework questions, or technical learning content.
- SET status to "flagged" ONLY if the content is clear spam, malicious hacking tools, harassment, scams, or completely unrelated non-technical toxic text or instructions on how to hack, compromise, or bypass accounts or systems, you must return { status: 'flagged', reason: 'Malicious intent / Hacking request' } even if the text is short or conceptual..


Return ONLY a valid JSON object matching this schema:
{
  "status": "approved" | "flagged",
  "reason": "a brief 1-sentence reason for this status evaluation"
}

<forum_post>
${text}
</forum_post>
`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const raw = response.text;
    const cleaned = raw.replace(/```json|```/g, "").trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Gemini error:", err);
    return {
      status: "flagged", // 🔒 Fail-secure: Send to moderation queue if AI fails
      reason: "API error or safety filter trigger",
    };
  }
}

  
export const getPendingModerationItems = async () => {
  const [rows] = await db.query(`
  SELECT
  question_id AS id,
  title,
  content AS body,
  user_id,
  moderation_status,
  created_at
FROM questions
WHERE moderation_status = 'pending'
ORDER BY created_at DESC
  `);

  return rows;
};

export const updateModerationStatus = async (id, status) => {
  const [result] = await db.query(
    `
    UPDATE questions
    SET moderation_status = ?
    WHERE question_id  = ?
    `,
    [status, id],
  );

  return result;
};
