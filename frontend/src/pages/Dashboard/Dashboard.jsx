/**
 * Dashboard — /dashboard
 * Hero section + stats snapshot + discussion feed.
 * Uses question.service.js (getQuestions / searchQuestionsSemantic).
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getQuestions,
  searchQuestionsSemantic,
} from "../../services/question/question.service";
import styles from "./Dashboard.module.css";

const PAGE_SIZE = 100;

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function stripMarkdown(text = "") {
  return text
    .replace(/[#*`>_~[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text = "", max = 140) {
  const plain = stripMarkdown(text);
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}

/* ─── spinner ─────────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className={styles.spinner} aria-label="Loading" role="status">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="31.4"
          strokeDashoffset="10"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.75s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}

/* ─── quick-action card ───────────────────────────────────────────────────── */
function QuickCard({ icon, label, description, onClick }) {
  return (
    <button type="button" className={styles.quickCard} onClick={onClick}>
      <span className={styles.quickCard__icon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.quickCard__copy}>
        <p className={styles.quickCard__label}>{label}</p>
        <p className={styles.quickCard__desc}>{description}</p>
      </div>
    </button>
  );
}

/* ─── stat card ───────────────────────────────────────────────────────────── */
function StatCard({ label, value }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statCard__label}>{label}</p>
      <p className={styles.statCard__value}>{value ?? 0}</p>
    </div>
  );
}

/* ─── question row ────────────────────────────────────────────────────────── */
function QuestionRow({ question, isOwn, onClick }) {
  const initials =
    (
      (question.firstName?.[0] || "") + (question.lastName?.[0] || "")
    ).toUpperCase() || "?";
  const replyCount = question.answerCount ?? question.replyCount ?? 0;

  return (
    <article
      className={`${styles.row} ${isOwn ? styles["row--own"] : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className={styles.row__avatar} aria-hidden="true">
        {question.avatarUrl ? (
          <img
            src={question.avatarUrl}
            alt=""
            className={styles.row__avatarImg}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className={styles.row__initials}>{initials}</span>
        )}
      </div>
      <div className={styles.row__body}>
        <div className={styles.row__titleRow}>
          <h3 className={styles.row__title}>{question.title}</h3>
          {isOwn && <span className={styles.row__ownBadge}>YOURS</span>}
        </div>
        {question.body && (
          <p className={styles.row__excerpt}>{excerpt(question.body)}</p>
        )}
        <div className={styles.row__meta}>
          <span className={styles.row__replies}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </span>
          <span className={styles.row__time}>
            {timeAgo(question.createdAt)} by {question.firstName}{" "}
            {question.lastName}
          </span>
          {question.score != null && (
            <span className={styles.row__score}>
              {Math.round(question.score * 100)}% match
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── main component ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlQ = searchParams.get("q") || "";
  const urlSemantic = searchParams.get("semantic") || "";

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isSearching = !!(urlQ || urlSemantic);
  const firstName = user?.firstName?.trim() || "";

  /* derived stats */
  const stats = {
    questions: questions.length,
    replies: questions.reduce(
      (acc, q) => acc + (q.answerCount ?? q.replyCount ?? 0),
      0,
    ),
    unanswered: questions.filter(
      (q) => (q.answerCount ?? q.replyCount ?? 0) === 0,
    ).length,
    yours: questions.filter(
      (q) => q.userId === user?.userId || q.userId === user?.id,
    ).length,
  };

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data;
      if (urlSemantic) {
        data = await searchQuestionsSemantic(urlSemantic, { limit: PAGE_SIZE });
      } else {
        data = await getQuestions({
          search: urlQ || undefined,
          limit: PAGE_SIZE,
        });
      }
      setQuestions(data.questions ?? data.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load questions.");
    } finally {
      setIsLoading(false);
    }
  }, [urlQ, urlSemantic]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return (
    <div className={styles.page}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <p className={styles.hero__eyebrow}>FORUM HOME</p>
        <h1 className={styles.hero__heading}>
          Good to see you{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className={styles.hero__sub}>
          Start a topic, revisit your own threads, or skim the live feed. Search
          above works from any page once you are back on Home.
        </p>

        <div className={styles.quickActions}>
          <QuickCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            label="New question"
            description="Share context, errors, and what you already tried"
            onClick={() => navigate("/questions/ask")}
          />
          <QuickCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
            label="Your topics"
            description="Filtered list of threads you authored"
            onClick={() => navigate("/my-questions")}
          />
          <QuickCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            }
            label="Knowledge base"
            description="Course library, uploads, and retrieval-backed context for threads"
            onClick={() => navigate("/rag-documents")}
          />
        </div>

        {/* Stats snapshot */}
        {isLoading ? (
          <p className={styles.hero__snapshotLoading}>
            Loading snapshot for the list below…
          </p>
        ) : (
          !error && (
            <div className={styles.stats}>
              <p className={styles.stats__note}>
                Figures below describe the newest threads in this feed (up to{" "}
                {PAGE_SIZE} from the API).
              </p>
              <hr />
              <div className={styles.stats__grid}>
                <StatCard
                  label="Questions"
                  value={stats.questions}
                  className={styles.stats__grid_element}
                />
                <StatCard
                  label="Replies"
                  value={stats.replies}
                  className={styles.stats__grid_element}
                />
                <StatCard
                  label="Unanswered"
                  value={stats.unanswered}
                  className={styles.stats__grid_element}
                />
                <StatCard
                  label="Yours"
                  value={stats.yours}
                  className={styles.stats__grid_element}
                />
              </div>
            </div>
          )
        )}
      </section>

      {/* ── Discussion feed ───────────────────────────────────────────────── */}
      <section className={styles.feed}>
        <div className={styles.feed__header}>
          <div>
            <h2 className={styles.feed__title}>
              {isSearching
                ? `Results for "${urlSemantic || urlQ}"`
                : "Discussion feed"}
            </h2>
            <p className={styles.feed__sub}>
              {isSearching
                ? urlSemantic
                  ? "AI semantic search results"
                  : "Keyword search results"
                : "Your threads use a slim left accent in this list."}
            </p>
          </div>
          {!isSearching && (
            <span className={styles.feed__badge}>NEWEST THREADS</span>
          )}
        </div>

        <div className={styles.feed__list}>
          {isLoading && (
            <div className={styles.feedCenter}>
              <Spinner />
              <p className={styles.feedCenter__text}>
                Loading recent questions…
              </p>
            </div>
          )}

          {!isLoading && error && (
            <div className={styles.feedError} role="alert">
              <p>{error}</p>
              <button
                type="button"
                className={styles.feedError__retry}
                onClick={fetchQuestions}
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && questions.length === 0 && (
            <div className={styles.feedCenter}>
              <p className={styles.feedCenter__empty}>
                {isSearching
                  ? `No results for "${urlSemantic || urlQ}".`
                  : "No questions found. Be the first to ask!"}
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            questions.map((q) => {
              const qId = q.question_hash || q.questionHash || q.id;
              const isOwn = q.userId === user?.userId || q.userId === user?.id;
              return (
                <QuestionRow
                  key={qId}
                  question={q}
                  isOwn={isOwn}
                  onClick={() => navigate(`/question/${qId}`)}
                />
              );
            })}
        </div>
      </section>
    </div>
  );
}
