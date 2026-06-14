// frontend/src/pages/MyQuestions/MyQuestions.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getQuestions } from "../../services/question/question.service";
import styles from "./MyQuestions.module.css";

/* ── helpers ─────────────────────────────────────────────────────────────── */

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

function excerpt(text = "", max = 180) {
  const plain = stripMarkdown(text);
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}

function getInitials(firstName, lastName) {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

/* ── QuestionRow ─────────────────────────────────────────────────────────── */

function QuestionRow({ question, onClick }) {
  const replyCount = question.answerCount ?? question.answer_count ?? 0;
  const createdAt = question.createdAt ?? question.created_at;
  const firstName = question.firstName ?? question.first_name ?? "You";
  const lastName = question.lastName ?? question.last_name ?? "";
  const initials = getInitials(firstName, lastName);
  const body = question.content ?? question.body ?? "";

  return (
    <article
      className={styles.row}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      {/* left orange accent */}
      <div className={styles.row__accent} aria-hidden="true" />

      {/* avatar */}
      <div className={styles.row__avatar} aria-hidden="true">
        <span className={styles.row__initials}>{initials}</span>
      </div>

      {/* body */}
      <div className={styles.row__body}>
        <div className={styles.row__titleRow}>
          <h3 className={styles.row__title}>{question.title}</h3>
          <span className={styles.row__ownBadge}>YOURS</span>
        </div>

        {body && <p className={styles.row__excerpt}>{excerpt(body)}</p>}

        <div className={styles.row__meta}>
          <span className={styles.row__replies}>
            <ChatIcon />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </span>
          <span className={styles.row__time}>
            {timeAgo(createdAt)} by {firstName} {lastName}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function MyQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myQuestions, setMyQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMyQuestions() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getQuestions({ mine: true });
        if (!cancelled) {
          setMyQuestions(data.questions ?? data.data ?? data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Failed to fetch questions.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchMyQuestions();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleQuestionClick(question) {
    const hash = question.question_hash ?? question.questionHash ?? question.id;
    navigate(`/question/${hash}`);
  }

  return (
    <div className={styles.page}>
      {/* ── Header card ── */}
      <div className={styles.headerCard}>
        <div className={styles.headerCard__left}>
          <p className={styles.headerCard__eyebrow}>YOUR WORKSPACE</p>
          <h1 className={styles.headerCard__title}>Your topics</h1>
          <p className={styles.headerCard__sub}>
            Only questions you created. Open one to read answers or add
            follow-ups. Rows use the same left accent as your threads on Home.
          </p>
        </div>
        <button
          className={styles.newQuestionBtn}
          onClick={() => navigate("/questions/ask")}
        >
          + New question
        </button>
      </div>

      {/* ── Content card ── */}
      <div className={styles.contentCard}>
        {/* Loading */}
        {isLoading && (
          <div className={styles.centerState}>
            <p className={styles.centerState__text}>
              Loading your questions...
            </p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className={`${styles.centerState} ${styles.centerState__error}`}>
            <p className={styles.centerState__errorText}>{error}</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && myQuestions.length === 0 && (
          <div className={styles.centerState}>
            <p className={styles.centerState__text}>
              You have not asked any questions yet. Use Ask a Question in the
              sidebar to start.
            </p>
          </div>
        )}

        {/* Question list */}
        {!isLoading && !error && myQuestions.length > 0 && (
          <div className={styles.list}>
            {myQuestions.map((q) => {
              const key =
                q.question_hash ?? q.questionHash ?? q.id ?? q.question_id;
              return (
                <QuestionRow
                  key={key}
                  question={q}
                  onClick={() => handleQuestionClick(q)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Icon ────────────────────────────────────────────────────────────────── */

function ChatIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      style={{ display: "inline", marginRight: 4 }}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
