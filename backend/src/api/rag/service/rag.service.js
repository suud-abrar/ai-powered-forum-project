import { safeExecute } from "../../../../db/config.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

// Generate Embedding
const generateEmbedding = async (text) => {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  return result.embeddings[0].values;
};

// Cosine Similarity
const cosineSimilarity = (a, b) => {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

// Main Service Logic
export const searchDocumentService = async ({ documentId, query, k = 5, userId }) => {
  if (!query) {
    throw new Error("Search query is required");
  }

  // 1. Create embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Get document chunks + embeddings
  const rows = await safeExecute(
    `
      SELECT
        dc.chunk_id,
        dc.content,
        dcv.embedding
      FROM document_chunks dc
      JOIN document_chunk_vectors dcv
        ON dc.chunk_id = dcv.chunk_id
      JOIN documents d
        ON dc.document_id = d.document_id
      WHERE d.document_id = ?
        AND d.user_id = ?
        AND dcv.status = 'ready'
    `,
    [documentId, userId],
  );

  // 3. Score each chunk
  const ranked = rows.map((row) => {
    const score = cosineSimilarity(queryEmbedding, JSON.parse(row.embedding));

    return {
      chunkId: row.chunk_id,
      content: row.content,
      score,
    };
  });

  // 4. Sort by best match
  ranked.sort((a, b) => b.score - a.score);

  // 5. Return top results
  return ranked.slice(0, k);
};