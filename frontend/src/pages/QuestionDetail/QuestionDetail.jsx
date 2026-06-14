// frontend/src/pages/QuestionDetail/QuestionDetail.jsx
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useParams, useNavigate, Link } from "react-router-dom";
import styles from "./QuestionDetail.module.css";
import {
  getSingleQuestion,
  assessAnswerFit,
  getSimilarQuestions,
} from "../../services/question/question.service";
import { postAnswer } from "../../services/answer/answer.service";
import { useAuth } from "../../contexts/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(firstName, lastName) {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "NU";
}

// ── FitBadge ─────────────────────────────────────────────────────────────────

function FitBadge({ level }) {
  const map = {
    strong: { label: "Strong Fit", className: styles.fitStrong },
    partial: { label: "Partial Fit", className: styles.fitPartial },
    weak: { label: "Weak Fit", className: styles.fitWeak },
  };
  const { label, className } = map[level] ?? map.weak;
  return <span className={`${styles.fitBadge} ${className}`}>{label}</span>;
}

// ── AnswerCard ────────────────────────────────────────────────────────────────

function AnswerCard({ answer }) {
  const initials = getInitials(
    answer.author?.firstName,
    answer.author?.lastName,
  );
  const name =
    answer.author?.firstName && answer.author?.lastName
      ? `${answer.author.firstName} ${answer.author.lastName}`
      : "New User";

  return (
    <div className={styles.answerCard}>
      <div className={styles.answerHeader}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.answerMeta}>
          <span className={styles.answerAuthor}>{name}</span>
          <span className={styles.answerDate}>
            {formatDate(answer.createdAt)}
          </span>
        </div>
      </div>
      <div className={styles.answerContent}>
        <ReactMarkdown>{answer.content}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [answerText, setAnswerText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);

  function insertMarkdown(prefix, suffix = "") {
    const textarea = document.getElementById("answer-textarea");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = answerText.slice(start, end);
    const before = answerText.slice(0, start);
    const after = answerText.slice(end);
    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    setAnswerText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }

  // ── Fetch question + similar questions on mount ───────────────────────────
  const [similarQuestions, setSimilarQuestions] = useState([]);
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch question details
        const data = await getSingleQuestion(questionHash);
        if (!cancelled) {
          setQuestion(data);
          setAnswers(data.answers ?? []);
        }

        // Fetch similar questions (non-critical — fails silently)
        try {
          const similar = await getSimilarQuestions(questionHash, {
            k: 5,
            threshold: 0.5,
          });
          if (!cancelled) setSimilarQuestions(similar);
        } catch {
          // sidebar failing won't break the page
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [questionHash]);

  // ── Derived state ─────────────────────────────────────────────────────────
  // ✅ Use snake_case field names from API
  const isOwnQuestion =
    user?.id && question?.user_id && user.id === question.user_id;
  const charCount = answerText.length;
  const canPost = charCount >= 20 && !isPosting;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleCheckFit() {
    if (charCount < 20) return;
    setIsCheckingFit(true);
    setFitResult(null);
    try {
      const result = await assessAnswerFit(questionHash, answerText);
      setFitResult(result);
    } catch {
      setFitResult({
        level: "weak",
        note: "Could not evaluate fit. Try again.",
      });
    } finally {
      setIsCheckingFit(false);
    }
  }

  async function handlePostAnswer() {
    if (!canPost) return;
    setIsPosting(true);
    setPostError(null);
    try {
      const newAnswer = await postAnswer(question.question_id, answerText); // ✅ snake_case
      setAnswers((prev) => [newAnswer, ...prev]);
      setAnswerText("");
      setFitResult(null);
    } catch (err) {
      console.error("Post answer error:", err); // ✅ log the real error
      console.error("Response:", err.response?.data); // ✅ log backend message
      setPostError("Failed to post answer. Please try again.");
    } finally {
      setIsPosting(false);
    }
  }
  // ── Render: Loading ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.centerMessage}>Loading question details...</div>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────

  if (error || !question) {
    return (
      <div className={styles.centerMessage}>
        <p className={styles.errorText}>Failed to load question details.</p>
        <button
          className={styles.returnBtn}
          onClick={() => navigate("/dashboard")}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ── Render: Full page ─────────────────────────────────────────────────────

  const questionAuthorName = question.author
    ? `${question.author.firstName ?? ""} ${question.author.lastName ?? ""}`.trim() ||
      "New User"
    : "New User";

  const questionInitials = question.author
    ? getInitials(question.author.firstName, question.author.lastName)
    : "NU";

  return (
    <div className={styles.page}>
      {/* ── Back link ── */}
      <Link to="/dashboard" className={styles.backLink}>
        ← Back to feed
      </Link>

      <div className={styles.layout}>
        {/* ── Main column ── */}
        <div className={styles.main}>
          {/* ── Question card ── */}
          <div className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <div className={styles.avatar}>{questionInitials}</div>
              <div>
                <div className={styles.authorName}>{questionAuthorName}</div>
                <div className={styles.postedDate}>
                  Posted {formatDate(question.createdAt)}
                </div>
              </div>
            </div>

            <h1 className={styles.questionTitle}>{question.title}</h1>
            <p className={styles.questionContent}>{question.content}</p>

            <div className={styles.questionFooter}>
              {/* Copy URL to clipboard */}
              <button
                className={styles.shareBtn}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }}
              >
                <ShareIcon /> Share
              </button>

              {/* Scroll to answers section */}
              <button
                className={styles.answersBtn}
                onClick={() =>
                  document
                    .getElementById("answers-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <ChatIcon /> {answers.length}{" "}
                {answers.length === 1 ? "Answer" : "Answers"}
              </button>
            </div>
          </div>

          {/* ── Community Answers ── */}
          <section id="answers-section" className={styles.answersSection}>
            <h2 className={styles.sectionTitle}>
              Community Answers ({answers.length})
            </h2>

            {answers.length === 0 ? (
              <div className={styles.emptyAnswers}>
                <ChatBubbleIcon />
                <p className={styles.emptyTitle}>Be the first to help!</p>
                <p className={styles.emptySubtitle}>
                  This question is waiting for an expert like you. Share your
                  knowledge and earn reputation points.
                </p>
              </div>
            ) : (
              <div className={styles.answerList}>
                {answers.map((answer) => (
                  <AnswerCard key={answer.id} answer={answer} />
                ))}
              </div>
            )}
          </section>

          {/* ── Post Answer Form ── */}
          {!isOwnQuestion && (
            <div className={styles.answerForm}>
              <h3 className={styles.formTitle}>Contribute an answer</h3>

              {postError && <p className={styles.postError}>{postError}</p>}

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <button
                    className={styles.toolBtn}
                    title="Bold"
                    onClick={() => insertMarkdown("**", "**")}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    className={styles.toolBtn}
                    title="Italic"
                    onClick={() => insertMarkdown("_", "_")}
                  >
                    <em>I</em>
                  </button>
                  <button
                    className={styles.toolBtn}
                    title="Code"
                    onClick={() => insertMarkdown("`", "`")}
                  >
                    {"</>"}
                  </button>
                  <button
                    className={styles.toolBtn}
                    title="Link"
                    onClick={() => insertMarkdown("[", "](url)")}
                  >
                    🔗
                  </button>
                </div>
                <span className={styles.charCount}>{charCount} characters</span>
              </div>

              <textarea
                id="answer-textarea"
                className={styles.textarea}
                placeholder="Type your answer here... You can use Markdown to format your code!"
                value={answerText}
                onChange={(e) => {
                  setAnswerText(e.target.value);
                  setFitResult(null);
                  setPostError(null);
                }}
                rows={8}
              />

              {/* AI Fit Feedback Panel */}
              {fitResult && (
                <div
                  className={`${styles.fitPanel} ${styles[`fitPanel_${fitResult.level}`]}`}
                >
                  <div className={styles.fitPanelHeader}>
                    <FitBadge level={fitResult.level} />
                  </div>
                  <p className={styles.fitNote}>{fitResult.note}</p>
                </div>
              )}

              {/* Actions */}
              <div className={styles.formActions}>
                <button
                  className={styles.checkFitBtn}
                  onClick={handleCheckFit}
                  disabled={charCount < 20 || isCheckingFit}
                >
                  {isCheckingFit ? "Checking..." : <>✦ Check draft fit</>}
                </button>
                <span className={styles.fitHint}>
                  Relevance only. Not grading correctness. You need at least 20
                  characters.
                </span>
                <button
                  className={styles.postBtn}
                  onClick={handlePostAnswer}
                  disabled={!canPost}
                >
                  {isPosting ? "Posting..." : "Post Your Answer"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar: Related Questions ── */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Related Questions</h3>
          {similarQuestions.length > 0 ? (
            similarQuestions.map((q) => (
              <Link
                key={q.questionHash}
                to={`/question/${q.questionHash}`}
                className={styles.relatedCard}
              >
                <p className={styles.relatedTitle}>{q.title}</p>
                <div className={styles.relatedMeta}>
                  <span className={styles.relatedTag}>
                    {q.author?.firstName} {q.author?.lastName}
                  </span>
                  <span className={styles.relatedDate}>
                    {formatDate(q.createdAt)}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className={styles.relatedTag}>No related questions found.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Inline SVG Icons ──────────────────────────────────────────────────────────

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ccc"
      strokeWidth="1.5"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
