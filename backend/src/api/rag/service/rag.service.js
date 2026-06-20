// backend/src/api/rag/service/rag.service.js
import { PDFParse } from "pdf-parse";
import { GoogleGenAI } from "@google/genai";
import { db, safeExecute } from "../../../../db/config.js";
import { NotFoundError } from "../../../utils/errors/index.js";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ── Constants from env ────────────────────────
const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const CHUNK_CHARS = parseInt(process.env.RAG_CHUNK_CHARS, 10) || 900;
const CHUNK_OVERLAP = parseInt(process.env.RAG_CHUNK_OVERLAP, 10) || 120;
const MAX_CHUNKS = parseInt(process.env.RAG_MAX_CHUNKS_PER_DOC, 10) || 1000;
const MAX_PDFS_PER_USER = parseInt(process.env.RAG_MAX_PDFS_PER_USER, 10) || 20;
const MIN_TEXT_CHARS = parseInt(process.env.RAG_MIN_TEXT_CHARS, 10) || 50;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate Embedding
const generateEmbedding = async (text) => {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  return result.embeddings[0].values;
};

function chunkText(text) {
  const chunks = [];
  const step = CHUNK_CHARS - CHUNK_OVERLAP;
  let start = 0;

  while (start < text.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(start + CHUNK_CHARS, text.length);
    const chunk = text.slice(start, end).trim();

    // Skip empty or whitespace-only chunks
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start += step;
  }

  return chunks;
}

async function embedChunk(text) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { taskType: "RETRIEVAL_DOCUMENT" },
  });

  return response.embeddings[0].values;
}

async function insertDocument(userId, file) {
  const RAG_UPLOAD_DIR = process.env.RAG_UPLOAD_DIR || "uploads/rag";

  // storage_path is relative: userId/filename
  // This makes the path portable across machines
  const storagePath = path.basename(file.path);

  const result = await safeExecute(
    `INSERT INTO documents
       (user_id, title, mime_type, storage_path, byte_size, status)
     VALUES (?, ?, ?, ?, ?, 'processing')`,
    [userId, file.originalname, file.mimetype, storagePath, file.size],
  );

  return result.insertId;
}

async function checkUserDocumentLimit(userId) {
  const rows = await safeExecute(
    `SELECT COUNT(*) AS total
     FROM documents
     WHERE user_id = ?
       AND status != 'failed'`,
    [userId],
  );

  const total = rows[0].total;

  if (total >= MAX_PDFS_PER_USER) {
    throw new Error(
      `Document limit reached. Maximum ${MAX_PDFS_PER_USER} documents per user.`,
    );
  }
}

async function updateDocumentStatus(documentId, status, errorMessage = null) {
  await safeExecute(
    `UPDATE documents
     SET status = ?, error_message = ?
     WHERE document_id = ?`,
    [status, errorMessage, documentId],
  );
}

async function fetchDocument(documentId) {
  const rows = await safeExecute(
    `SELECT * FROM documents WHERE document_id = ?`,
    [documentId],
  );
  return rows[0];
}

export async function createDocumentFromUploadService({ userId, file }) {
  // Step 1 — check document limit before doing anything
  await checkUserDocumentLimit(userId);

  // Step 2 — insert document record immediately
  const documentId = await insertDocument(userId, file);

  try {
    const fileBuffer = fs.readFileSync(file.path);

    const parser = new PDFParse({ data: fileBuffer });

    const result = await parser.getText();

    const rawText = result.text || "";

    // Step 4 — validate extracted text
    if (rawText.trim().length < MIN_TEXT_CHARS) {
      throw new Error(
        "PDF contains insufficient text. It may be scanned or image-based.",
      );
    }

    // Step 5 — chunk the text
    const chunks = chunkText(rawText);

    if (chunks.length === 0) {
      throw new Error("No text chunks could be extracted from this PDF.");
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];

      // Insert chunk row
      const chunkResult = await safeExecute(
        `INSERT INTO document_chunks
           (document_id, chunk_index, content)
         VALUES (?, ?, ?)`,
        [documentId, i, chunkContent],
      );

      const chunkId = chunkResult.insertId;

      // Generate embedding for this chunk
      const embedding = await embedChunk(chunkContent);

      // Store the embedding vector
      await safeExecute(
        `INSERT INTO document_chunk_vectors
           (chunk_id, source_text, embedding, status)
         VALUES (?, ?, ?, 'ready')`,
        [chunkId, chunkContent, JSON.stringify(embedding)],
      );
    }

    // Step 7 — mark document as ready
    await updateDocumentStatus(documentId, "ready");
  } catch (err) {
    await updateDocumentStatus(documentId, "failed", err.message);
    throw err;
  }

  // Step 8 — return the full document record
  return fetchDocument(documentId);
}
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
export const searchDocumentService = async ({
  documentId,
  query,
  k = 5,
  userId,
}) => {
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
    const score = cosineSimilarity(queryEmbedding, row.embedding);

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

export const queryDocumentService = async ({ documentId, query, userId }) => {
  if (!query) {
    throw new Error("query is required");
  }

  // 1. Embed question
  const queryEmbedding = await generateEmbedding(query);

  // 2. Fetch relevant chunks
  const rows = await safeExecute(
    `
    SELECT dc.content, dcv.embedding
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

  // 3. Rank chunks
  const ranked = rows.map((row) => {
    const score = cosineSimilarity(queryEmbedding, row.embedding);

    return {
      content: row.content,
      score,
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  const topChunks = ranked.slice(0, 5);

  // 4. Build context
  const context = topChunks.map((c) => c.content).join("\n\n");

  // 5. Call Gemini (FINAL STEP)
  const prompt = `
You are an AI assistant. Answer ONLY using the context below.

Context:
${context}

Question:
${query}

If the answer is not in the context, say "Not found in document".
`;

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash-lite",
    contents: prompt,
  });

  return {
    answer: response.text,
    sources: topChunks,
  };
};

// Suud's part

export const getDocumentMetaService = async (documentId, userId) => {
  // 1. Fetch document matching both documentId and userId
  const rows = await safeExecute(
    `SELECT
      document_id,
      title,
      mime_type,
      byte_size,
      status,
      error_message,
      created_at,
      updated_at,
      user_id,
      storage_path
    FROM documents
    WHERE document_id = ? AND user_id = ?
    LIMIT 1`,
    [documentId, userId],
  );

  // 2. Return 404 if not found or doesn't belong to user
  if (!rows || rows.length === 0) {
    throw new NotFoundError("Document not found");
  }

  // 3. Return the document record
  return rows[0];
};

// add below getDocumentMetaService

export const assertOwnedDocument = async (documentId, userId) => {
  // Fetch document matching both documentId and userId
  const rows = await safeExecute(
    `SELECT
      document_id,
      storage_path,
      title,
      mime_type
    FROM documents
    WHERE document_id = ? AND user_id = ?
    LIMIT 1`,
    [documentId, userId],
  );

  // Return 404 if not found or doesn't belong to user
  if (!rows || rows.length === 0) {
    throw new NotFoundError("Document not found");
  }

  return rows[0]; // { document_id, storage_path, title, mime_type }
};

// add below assertOwnedDocument

export const listDocumentsForUserService = async (userId) => {
  // Fetch all documents belonging to this user, latest first
  const rows = await safeExecute(
    `SELECT
      document_id,
      title,
      mime_type,
      byte_size,
      status,
      error_message,
      created_at,
      updated_at
    FROM documents
    WHERE user_id = ?
    ORDER BY created_at DESC`,
    [userId],
  );

  // Return empty array if no documents found
  return rows || [];
};

export const deleteDocumentService = async (documentId, userId) => {
  // 1. Verify ownership — reuse assertOwnedDocument
  const document = await assertOwnedDocument(documentId, userId);

  // 2. Resolve absolute path of the PDF on disk
  const absolutePath = path.resolve(
    __dirname,
    "../../../../../uploads",
    document.storage_path,
  );

  // 3. Delete file from disk
  // if file is already missing, don't throw — just continue
  try {
    await fsPromises.unlink(absolutePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      // ENOENT means file not found — that's ok
      // any other error is a real problem
      throw err;
    }
  }

  // 4. Delete record from DB
  // CASCADE will automatically delete related chunks and vectors
  await safeExecute(
    `DELETE FROM documents WHERE document_id = ? AND user_id = ?`,
    [documentId, userId],
  );

  return { id: documentId };
};
