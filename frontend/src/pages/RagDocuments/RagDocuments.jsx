/**
 * RagDocuments — /rag-documents
 * Private PDF library: upload, list, preview, semantic search, AI-grounded Q&A.
 *
 * Layout: Library (left) + Reader/Search/Ask stacked sections (right).
 * Matches design: not a tab interface — all three sections render together
 * once a READY document is selected.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  listDocuments,
  uploadPdf,
  deleteDocument,
  searchInDocument,
  queryDocument,
  fetchPdfObjectUrl,
} from '../../services/rag/rag.service';
import RagAnswerBody from '../../components/RagAnswerBody/RagAnswerBody';
import styles from './RagDocuments.module.css';

/* ─── icons ────────────────────────────────────────────────────────────────── */
function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    </svg>
  );
}

/* ─── status badge ────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    ready: { label: 'READY', cls: styles.badgeReady },
    processing: { label: 'PROCESSING', cls: styles.badgeProcessing },
    failed: { label: 'FAILED', cls: styles.badgeFailed },
  };
  const { label, cls } = map[status] || map.processing;
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function formatSize(bytes) {
  if (bytes == null) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

/* ─── document row ────────────────────────────────────────────────────────── */
function DocumentRow({ doc, isSelected, onSelect, onDelete }) {
  return (
    <div
      className={`${styles.docRow} ${isSelected ? styles['docRow--selected'] : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
    >
      <div className={styles.docRow__main}>
        <p className={styles.docRow__name}>{doc.title}</p>
        <StatusBadge status={doc.status} />
      </div>
      <button
        type="button"
        className={styles.docRow__delete}
        onClick={e => { e.stopPropagation(); onDelete(); }}
        aria-label={`Delete ${doc.title}`}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────────────────── */
export default function RagDocuments() {
  /* library state */
  const [documents, setDocuments] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  /* upload state */
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  /* selected doc state */
  const [selectedDocId, setSelectedDocId] = useState(null);
  const selectedDoc = documents.find(d => d.document_id === selectedDocId) || null;

  /* preview state */
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  /* search state */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  /* ask state */
  const [askQuery, setAskQuery] = useState('');
  const [askResult, setAskResult] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState(null);

  /* ── fetch library on mount ──────────────────────────────────────────────── */
  const fetchList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      setListError('Could not load documents.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  /* ── upload ───────────────────────────────────────────────────────────────── */
  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const newDoc = await uploadPdf(selectedFile);
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  /* ── delete ───────────────────────────────────────────────────────────────── */
  async function handleDelete(doc) {
    const docId = doc.document_id;
    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.document_id !== docId));
      if (selectedDocId === docId) {
        setSelectedDocId(null);
      }
    } catch {
      // keep it simple — could add a toast/error banner here if needed
    }
  }

  /* ── select a document ───────────────────────────────────────────────────── */
  function handleSelectDoc(doc) {
    const docId = doc.document_id;
    setSelectedDocId(docId);
    setSearchQuery(''); setSearchResults(null); setSearchError(null);
    setAskQuery(''); setAskResult(null); setAskError(null);
    setPdfUrl(null); setPreviewError(null);
  }

  /* ── load preview when a READY doc is selected ───────────────────────────── */
  useEffect(() => {
    if (!selectedDoc || selectedDoc.status !== 'ready') {
      setPdfUrl(null);
      return;
    }
    const docId = selectedDoc.document_id;
    let objectUrl = null;
    let cancelled = false;

    async function loadPreview() {
      setIsLoadingPreview(true);
      setPreviewError(null);
      try {
        objectUrl = await fetchPdfObjectUrl(docId);
        if (!cancelled) setPdfUrl(objectUrl);
      } catch {
        if (!cancelled) setPreviewError('Could not load preview.');
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    }
    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedDoc]);

  /* ── search ───────────────────────────────────────────────────────────────── */
  async function handleSearch() {
    if (!searchQuery.trim() || !selectedDoc) return;
    const docId = selectedDoc.document_id;
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    try {
      const results = await searchInDocument(docId, searchQuery);
      setSearchResults(results);
    } catch {
      setSearchError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  }

  /* ── ask with AI ──────────────────────────────────────────────────────────── */
  async function handleAsk() {
    if (!askQuery.trim() || !selectedDoc) return;
    const docId = selectedDoc.document_id;
    setIsAsking(true);
    setAskError(null);
    setAskResult(null);
    try {
      const result = await queryDocument(docId, askQuery);
      setAskResult(result);
    } catch {
      setAskError('Could not get an answer.');
    } finally {
      setIsAsking(false);
    }
  }

  /* ── render ───────────────────────────────────────────────────────────────── */
  return (
    <div className={styles.page}>
      {/* page header */}
      <header className={styles.pageHeader}>
        <p className={styles.pageHeader__eyebrow}>KNOWLEDGE BASE</p>
        <h1 className={styles.pageHeader__heading}>Private PDF library</h1>
        <p className={styles.pageHeader__sub}>
          Upload study or reference PDFs to your own workspace. Each file is indexed for semantic search and optional AI answers that cite passages from that document only. File size limits apply on the server; other users never see your uploads.
        </p>
      </header>

      {listError && (
        <div className={styles.listErrorBanner} role="alert">
          {listError}
        </div>
      )}

      <div className={styles.columns}>
        {/* ── LEFT: Library ───────────────────────────────────────────────── */}
        <div className={styles.library}>
          <h2 className={styles.library__title}>Library</h2>
          <p className={styles.library__sub}>Add PDFs here. Processing runs once per upload.</p>

          {/* upload dropzone */}
          <div className={styles.uploadBox}>
            <p className={styles.uploadBox__hint}>
              Accepted format: PDF. Maximum file size is enforced by the server.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className={styles.uploadBox__hiddenInput}
            />
            <div className={styles.uploadBox__actions}>
              <button type="button" className={styles.uploadBox__chooseBtn} onClick={handleChooseFile} disabled={isUploading}>
                <FileIcon /> Choose file
              </button>
              <button
                type="button"
                className={styles.uploadBox__uploadBtn}
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                <UploadIcon /> {isUploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            <p className={styles.uploadBox__filename}>
              {selectedFile ? `${selectedFile.name} · ${formatSize(selectedFile.size)}` : 'No file selected.'}
            </p>
            {uploadError && <p className={styles.uploadBox__error}>{uploadError}</p>}
          </div>

          {/* document list */}
          {isLoadingList && (
            <p className={styles.library__loading}>Loading your library…</p>
          )}

          {!isLoadingList && documents.length === 0 && !listError && (
            <p className={styles.library__empty}>
              Your library is empty. Upload a PDF to index it for search and Q&amp;A.
            </p>
          )}

          {!isLoadingList && documents.length > 0 && (
            <div className={styles.docList}>
              {documents.map(doc => {
                const docId = doc.document_id;
                return (
                  <DocumentRow
                    key={docId}
                    doc={doc}
                    isSelected={selectedDocId === docId}
                    onSelect={() => handleSelectDoc(doc)}
                    onDelete={() => handleDelete(doc)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Reader + Search + Ask ────────────────────────────────── */}
        <div className={styles.workspace}>
          {!selectedDoc && (
            <div className={styles.placeholder}>
              <p>
                Choose a document from the library to open the reader, run semantic search over its text, and ask questions with AI-assisted answers grounded in that file.
              </p>
            </div>
          )}

          {selectedDoc && selectedDoc.status !== 'ready' && (
            <div className={styles.placeholder}>
              <p>
                This document is not ready for preview or AI tools. Current status: <strong>{selectedDoc.status}</strong>.
              </p>
            </div>
          )}

          {selectedDoc && selectedDoc.status === 'ready' && (
            <>
              {/* Reader */}
              <section className={styles.section}>
                <h2 className={styles.section__title}>Reader</h2>
                <p className={styles.section__sub}>Inline preview of the selected PDF.</p>
                <div className={styles.readerFrame}>
                  {isLoadingPreview && <p className={styles.readerFrame__msg}>Loading preview…</p>}
                  {!isLoadingPreview && previewError && <p className={styles.readerFrame__msg}>{previewError}</p>}
                  {!isLoadingPreview && !previewError && pdfUrl && (
                    <iframe src={pdfUrl} title="PDF preview" className={styles.readerFrame__iframe} />
                  )}
                </div>
              </section>

              {/* Semantic search */}
              <section className={styles.section}>
                <h2 className={styles.section__title}>Semantic search</h2>
                <p className={styles.section__sub}>Finds passages by meaning (embeddings), not only exact keywords.</p>

                <label className={styles.field__label} htmlFor="search-query">Search query</label>
                <input
                  id="search-query"
                  type="text"
                  className={styles.field__input}
                  placeholder="Describe the topic or phrase you are looking for"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={isSearching}
                />
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                >
                  <SparkleIcon /> {isSearching ? 'Searching…' : 'Search'}
                </button>

                {searchError && <p className={styles.inlineError}>{searchError}</p>}

                {searchResults && searchResults.length > 0 && (
                  <div className={styles.resultsList}>
                    {searchResults.map((r, i) => (
                      <div key={r.chunkId ?? i} className={styles.resultCard}>
                        <div className={styles.resultCard__header}>
                          <span className={styles.resultCard__score}>
                            {Math.round((r.score ?? 0) * 100)}% match
                          </span>
                        </div>
                        <p className={styles.resultCard__content}>{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults && searchResults.length === 0 && (
                  <p className={styles.section__sub}>No matching passages found.</p>
                )}
              </section>

              {/* Ask with AI */}
              <section className={styles.section}>
                <h2 className={styles.section__title}>Ask with AI</h2>
                <p className={styles.section__sub}>
                  Answers use only retrieved excerpts from this PDF, with citations where possible. When the document includes code, the reply may show it in formatted blocks you can copy.
                </p>

                <label className={styles.field__label} htmlFor="ask-query">Question</label>
                <textarea
                  id="ask-query"
                  className={styles.field__textarea}
                  placeholder="Ask a clear question in plain language. If the document does not cover it, the model should say so."
                  value={askQuery}
                  onChange={e => setAskQuery(e.target.value)}
                  disabled={isAsking}
                  rows={4}
                />
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleAsk}
                  disabled={!askQuery.trim() || isAsking}
                >
                  <SparkleIcon /> {isAsking ? 'Asking…' : 'Ask'}
                </button>

                {askError && <p className={styles.inlineError}>{askError}</p>}

                {askResult && (
                  <div className={styles.answerBox}>
                    <RagAnswerBody>{askResult.answer}</RagAnswerBody>
                    {askResult.sources?.length > 0 && (
                      <div className={styles.sourcesList}>
                        <p className={styles.sourcesList__label}>Sources</p>
                        {askResult.sources.map((s, i) => (
                          <div key={i} className={styles.sourcesList__item}>
                            <span className={styles.resultCard__score}>
                              {Math.round((s.score ?? 0) * 100)}% match
                            </span>
                            <p>{s.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}