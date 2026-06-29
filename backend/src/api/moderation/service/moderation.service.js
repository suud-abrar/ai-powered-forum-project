import { GoogleGenAI } from "@google/genai";
import { db } from "../../../../db/config.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function moderateWithGemini(text) {
  try {
    const prompt = `
You are an automated backend content moderation system.

RULES:
- APPROVE: normal programming content
- FLAGGED: hacking, exploits, spam

Return ONLY JSON:
{
  "status": "approved" | "flagged",
  "reason": "short explanation"
}

<forum_post>
${text}
</forum_post>
`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: prompt,
    });

    // SAFE extraction (FIX)
    const raw =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    let cleaned = raw.trim();

    // remove markdown if present
    cleaned = cleaned
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Gemini moderation error:", err);

    return {
      status: "flagged",
      reason: "fallback safety mode",
    };
  }
}

/* ──────────────────────────────── */
/* DATABASE FUNCTIONS */
/* ──────────────────────────────── */

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
    WHERE moderation_status = 'flagged'
    ORDER BY created_at DESC
  `);

  return rows;
};

export const updateModerationStatus = async (id, status) => {
  const [result] = await db.query(
    `
    UPDATE questions
    SET moderation_status = ?
    WHERE question_id = ?
    `,
    [status, id],
  );

  return result;
};
