/**
 * rag.service.js
 * All API calls related to the RAG Knowledge Base (PDF library).
 *
 * CONFIRMED shapes (from rag.controller.js):
 *   listDocuments       -> GET  /api/rag/documents
 *     -> { data: [{ document_id, title, mime_type, byte_size, status, error_message, created_at, updated_at }] }
 *   getDocumentMeta     -> GET  /api/rag/documents/:documentId
 *     -> { data: { document_id, title, mime_type, byte_size, status, error_message, created_at, updated_at, user_id, storage_path } }
 *   deleteDocument      -> DELETE /api/rag/documents/:documentId -> { data: { id } }
 *   fetchPdfObjectUrl   -> GET  /api/rag/documents/:documentId/file (streams raw PDF, Content-Type: application/pdf)
 *   searchInDocument    -> GET  /api/rag/documents/:documentId/search?query=&k=
 *     -> { data: [{ chunkId, content, score }] }
 *   queryDocument       -> POST /api/rag/documents/:documentId/query { query }
 *     -> { data: { answer, sources: [{ content, score }] } }
 *
 * UNCONFIRMED:
 *   uploadPdf -> POST /api/rag/documents (multipart) — built against task spec,
 *   adjust once the upload controller is shared.
 */

import { apiClient } from '../core/api.client';

/** GET /api/rag/documents — list all PDFs uploaded by the user */
export async function listDocuments() {
  const res = await apiClient.get('/api/rag/documents');
  return res.data.data ?? [];
}

/** POST /api/rag/documents — upload + process a PDF (multipart/form-data) */
export async function uploadPdf(file, { onUploadProgress } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/api/rag/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return res.data.data ?? res.data;
}

/** GET /api/rag/documents/:documentId — metadata + processing status */
export async function getDocumentMeta(documentId) {
  const res = await apiClient.get(`/api/rag/documents/${documentId}`);
  return res.data.data;
}

/** DELETE /api/rag/documents/:documentId */
export async function deleteDocument(documentId) {
  const res = await apiClient.delete(`/api/rag/documents/${documentId}`);
  return res.data.data;
}

/** GET /api/rag/documents/:documentId/search?query=&k= */
export async function searchInDocument(documentId, query, { k = 5 } = {}) {
  const res = await apiClient.get(`/api/rag/documents/${documentId}/search`, {
    params: { query, k },
  });
  return res.data.data ?? [];
}

/** POST /api/rag/documents/:documentId/query { query } */
export async function queryDocument(documentId, query) {
  const res = await apiClient.post(`/api/rag/documents/${documentId}/query`, { query });
  return res.data.data;
}

/**
 * GET /api/rag/documents/:documentId/file — streams the raw PDF
 * (Content-Type: application/pdf, Content-Disposition: inline).
 * Returns an object URL for use in an <iframe>. Caller MUST call
 * URL.revokeObjectURL on cleanup/unmount to avoid memory leaks.
 */
export async function fetchPdfObjectUrl(documentId) {
  const res = await apiClient.get(`/api/rag/documents/${documentId}/file`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(res.data);
}