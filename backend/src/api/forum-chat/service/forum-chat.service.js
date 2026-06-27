import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeExecute } from "../../../../db/config.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TOP_K = parseInt(process.env.RECOMMEND_K, 10) || 5;

// Cosine similarity
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

// Embed query
async function embedQuery(queryText) {
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_EMBEDDING_MODEL,
    });
    const result = await model.embedContent(queryText);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding error:", error);
    throw new Error("Failed to embed query");
  }
}

// Fetch forum post vectors only
async function fetchForumPostVectors() {
  try {
    const rows = await safeExecute(
      `SELECT vector_id, post_type, post_id, embedding
       FROM forum_post_vectors
       WHERE status = 'ready'`,
      [],
    );

    return rows.map((row) => ({
      sourceType: row.post_type,
      postId: row.post_id,
      embedding:
        typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding,
    }));
  } catch (error) {
    console.error("fetchForumPostVectors error:", error);
    return [];
  }
}

// Hydrate citations
async function hydrateCitations(topMatches) {
  const citations = [];

  const questionIds = topMatches
    .filter((m) => m.sourceType === "question")
    .map((m) => m.postId);

  const answerIds = topMatches
    .filter((m) => m.sourceType === "answer")
    .map((m) => m.postId);

  const scoreMap = new Map(
    topMatches.map((m) => [`${m.sourceType}:${m.postId}`, m.score]),
  );

  // Hydrate questions
  if (questionIds.length > 0) {
    const placeholders = questionIds.map(() => "?").join(", ");
    const rows = await safeExecute(
      `SELECT question_id, question_hash, title
       FROM questions
       WHERE question_id IN (${placeholders})`,
      questionIds,
    );

    rows.forEach((row) => {
      citations.push({
        id: row.question_hash,
        type: "question",
        title: row.title,
        score: scoreMap.get(`question:${row.question_id}`),
      });
    });
  }

  // Hydrate answers
  if (answerIds.length > 0) {
    const placeholders = answerIds.map(() => "?").join(", ");
    const rows = await safeExecute(
      `SELECT a.answer_id, a.content, q.question_hash
       FROM answers a
       JOIN questions q ON q.question_id = a.question_id
       WHERE a.answer_id IN (${placeholders})`,
      answerIds,
    );

    rows.forEach((row) => {
      citations.push({
        id: row.answer_id,
        type: "answer",
        title: row.content.slice(0, 100),
        score: scoreMap.get(`answer:${row.answer_id}`),
      });
    });
  }

  return citations.sort((a, b) => b.score - a.score);
}

// Main service - forum posts only
export async function queryForumChatService({ query, userId }) {
  try {
    console.log("✅ 1. Embedding query...");
    const queryEmbedding = await embedQuery(query);

    console.log("✅ 2. Fetching forum vectors...");
    const forumVectors = await fetchForumPostVectors();

    if (forumVectors.length === 0) {
      return {
        answer:
          "No forum data available. Please create some questions and answers first.",
        citations: [],
      };
    }

    console.log("✅ 3. Scoring candidates...");
    const scored = forumVectors.map((candidate) => ({
      ...candidate,
      score: cosineSimilarity(queryEmbedding, candidate.embedding),
    }));

    const topMatches = scored.sort((a, b) => b.score - a.score).slice(0, TOP_K);

    console.log("✅ 4. Hydrating citations...");
    const citations = await hydrateCitations(topMatches);

    console.log("✅ 5. Generating answer...");
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash-lite",
    });

    const context = citations
      .map((c, i) => `[${i + 1}] ${c.type}: ${c.title}`)
      .join("\n\n");

    const prompt = `Answer this question using ONLY the provided forum posts. Reference sources as [1], [2], etc.

Context:
${context || "No context available"}

Question: ${query}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    console.log("✅ 6. Response ready!");
    return { answer, citations };
  } catch (error) {
    console.error("❌ queryForumChatService error:", error);
    throw error;
  }
}
