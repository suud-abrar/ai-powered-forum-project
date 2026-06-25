import { db } from "../../../../db/config.js";
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
