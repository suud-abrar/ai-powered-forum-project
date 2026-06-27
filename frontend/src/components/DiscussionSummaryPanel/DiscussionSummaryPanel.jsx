/**
 * DiscussionSummaryPanel
 * Collapsible AI-generated summary of all answers on a question.
 * Rendered above the answers list, only when answers.length > ANSWER_THRESHOLD.
 *
 * Lazy: only calls getAnswerSummary() the first time the panel is expanded,
 * so questions with many answers don't pay the AI cost unless someone asks.
 */

import { useState } from 'react';
import { getAnswerSummary } from '../../services/question/question.service';
import styles from './DiscussionSummaryPanel.module.css';

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={styles.chevron}
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

export default function DiscussionSummaryPanel({ questionHash, answerCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  async function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && !hasLoaded) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAnswerSummary(questionHash);
        setSummary(result);
        setHasLoaded(true);
      } catch {
        setError('Could not generate a summary right now.');
      } finally {
        setIsLoading(false);
      }
    }
  }

  function handleRetry() {
    setHasLoaded(false);
    setError(null);
    handleToggle();
  }

  // Normalize summary shape — backend may return bullets[] or just summary text
  const bullets = summary?.bullets ?? null;
  const summaryText = summary?.summary ?? null;
  const consensus = summary?.consensus ?? null;

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.panel__header}
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span className={styles.panel__headerLeft}>
          <span className={styles.panel__icon}><SparkleIcon /></span>
          <span className={styles.panel__title}>Discussion Summary</span>
          <span className={styles.panel__count}>{answerCount} answers</span>
        </span>
        <ChevronIcon open={isOpen} />
      </button>

      {isOpen && (
        <div className={styles.panel__body}>
          {isLoading && (
            <p className={styles.panel__loading}>Summarizing the discussion…</p>
          )}

          {!isLoading && error && (
            <div className={styles.panel__error}>
              <p>{error}</p>
              <button type="button" className={styles.panel__retryBtn} onClick={handleRetry}>
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && (bullets || summaryText) && (
            <>
              {summaryText && <p className={styles.panel__summaryText}>{summaryText}</p>}
              {bullets && bullets.length > 0 && (
                <ul className={styles.panel__bullets}>
                  {bullets.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              )}
              {consensus && (
                <div className={styles.panel__consensus}>
                  <span className={styles.panel__consensusLabel}>Consensus</span>
                  <p>{consensus}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
