/**
 * ForgotPassword: three-step flow
 * Step 1 — enter email
 * Step 2 — enter 6-digit code
 * Step 3 — set new password
 */
import { useState, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Eye, EyeOff, MessageSquare, CheckCircle } from "lucide-react";
import {
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../../services/auth/auth.service";
import styles from "./ForgotPassword.module.css";

const STEP_EMAIL = 1;
const STEP_CODE = 2;
const STEP_PASSWORD = 3;
const STEP_DONE = 4;

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEP_EMAIL);

  // Step 1
  const [email, setEmail] = useState("");

  // Step 2
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = [
    useRef(), useRef(), useRef(), useRef(), useRef(), useRef(),
  ];

  // Step 3
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Shared
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Step 1: Send code ─────────────────────────────────────────────────────

  async function handleSendCode(e) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return setError("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
      return setError("Enter a valid email address.");

    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setStep(STEP_CODE);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify code ───────────────────────────────────────────────────

  function handleCodeChange(index, value) {
    if (!/^\d?$/.test(value)) return; // digits only
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) codeRefs[index + 1].current.focus();
  }

  function handleCodeKeyDown(index, e) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs[index - 1].current.focus();
    }
  }

  function handleCodePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setCode(next);
    const lastFilled = Math.min(pasted.length, 5);
    codeRefs[lastFilled].current.focus();
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError(null);
    const fullCode = code.join("");
    if (fullCode.length < 6) return setError("Enter all 6 digits.");

    setLoading(true);
    try {
      const token = await verifyResetCode(email.trim().toLowerCase(), fullCode);
      setResetToken(token);
      setStep(STEP_PASSWORD);
    } catch {
      setError("Invalid or expired code. Check your email and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Reset password ────────────────────────────────────────────────

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6)
      return setError("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword)
      return setError("Passwords do not match.");

    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setStep(STEP_DONE);
    } catch {
      setError("Failed to reset password. Please start over.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step indicator ────────────────────────────────────────────────────────

  const stepLabels = ["Email", "Verify", "Password"];

  return (
    <div className={styles.page}>
      {/* ── Left panel ── */}
      <section className={styles.panel}>
        <div className={styles.panelContent}>
          <div
            className={styles.brand}
            onClick={() => navigate("/")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate("/");
            }}
          >
            <div className={styles.brandLogo}>
              <MessageSquare size={20} className={styles.brandLogoIcon} />
            </div>
            <div>
              <p className={styles.brandName}>Evangadi Forum</p>
              <p className={styles.brandTagline}>Learn together. Ask with context.</p>
            </div>
          </div>

          <div className={styles.panelBody}>
            <h2 className={styles.panelTitle}>Recover your account</h2>
            <p className={styles.panelDesc}>
              We'll send a 6-digit code to your email. Use it to verify your
              identity and set a new password.
            </p>

            <div className={styles.steps}>
              {stepLabels.map((label, i) => {
                const num = i + 1;
                const done = step > num;
                const active = step === num;
                return (
                  <div key={label} className={styles.stepItem}>
                    <div
                      className={`${styles.stepDot} ${done ? styles.stepDotDone : ""} ${active ? styles.stepDotActive : ""}`}
                    >
                      {done ? <CheckCircle size={14} /> : num}
                    </div>
                    <span
                      className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ""}`}
                    >
                      {label}
                    </span>
                    {i < stepLabels.length - 1 && (
                      <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ""}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Right panel ── */}
      <section className={styles.formSection}>
        <div className={styles.formContainer}>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Email ── */}
            {step === STEP_EMAIL && (
              <Motion.div
                key="email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.formHeader}>
                  <h2 className={styles.formTitle}>Forgot your password?</h2>
                  <p className={styles.formSubtitle}>
                    Enter the email address linked to your account and we'll
                    send you a reset code.
                  </p>
                </div>

                <form className={styles.form} onSubmit={handleSendCode}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Email Address</label>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {error && <div className={styles.error}>{error}</div>}

                  <button
                    type="submit"
                    className={styles.btn}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send reset code"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>

                <div className={styles.footer}>
                  <button
                    className={styles.footerLink}
                    onClick={() => navigate("/auth")}
                  >
                    <ArrowLeft size={14} /> Back to sign in
                  </button>
                </div>
              </Motion.div>
            )}

            {/* ── Step 2: Code ── */}
            {step === STEP_CODE && (
              <Motion.div
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.formHeader}>
                  <h2 className={styles.formTitle}>Check your email</h2>
                  <p className={styles.formSubtitle}>
                    We sent a 6-digit code to{" "}
                    <strong>{email}</strong>. It expires in 15 minutes.
                  </p>
                </div>

                <form className={styles.form} onSubmit={handleVerifyCode}>
                  <div className={styles.codeGroup}>
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={codeRefs[i]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={styles.codeInput}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        onPaste={i === 0 ? handleCodePaste : undefined}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  {error && <div className={styles.error}>{error}</div>}

                  <button
                    type="submit"
                    className={styles.btn}
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify code"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>

                <div className={styles.footer}>
                  <button
                    className={styles.footerLink}
                    onClick={() => {
                      setCode(["", "", "", "", "", ""]);
                      setError(null);
                      setStep(STEP_EMAIL);
                    }}
                  >
                    <ArrowLeft size={14} /> Use a different email
                  </button>
                  <button
                    className={styles.footerLink}
                    onClick={async () => {
                      setError(null);
                      setLoading(true);
                      try {
                        await forgotPassword(email.trim().toLowerCase());
                        setCode(["", "", "", "", "", ""]);
                      } catch {
                        setError("Could not resend. Try again.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Resend code
                  </button>
                </div>
              </Motion.div>
            )}

            {/* ── Step 3: New password ── */}
            {step === STEP_PASSWORD && (
              <Motion.div
                key="password"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.formHeader}>
                  <h2 className={styles.formTitle}>Set a new password</h2>
                  <p className={styles.formSubtitle}>
                    Choose a strong password you haven't used before.
                  </p>
                </div>

                <form className={styles.form} onSubmit={handleResetPassword}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>New Password</label>
                    <div className={styles.passwordWrap}>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`${styles.input} ${styles.inputPassword}`}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Confirm Password</label>
                    <div className={styles.passwordWrap}>
                      <input
                        type={showConfirm ? "text" : "password"}
                        className={`${styles.input} ${styles.inputPassword}`}
                        placeholder="Repeat your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowConfirm((v) => !v)}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && <div className={styles.error}>{error}</div>}

                  <button
                    type="submit"
                    className={styles.btn}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Reset password"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>
              </Motion.div>
            )}

            {/* ── Step 4: Done ── */}
            {step === STEP_DONE && (
              <Motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={styles.doneWrapper}
              >
                <div className={styles.doneIcon}>
                  <CheckCircle size={40} />
                </div>
                <h2 className={styles.formTitle}>Password reset</h2>
                <p className={styles.formSubtitle}>
                  Your password has been updated. You can now sign in with your
                  new password.
                </p>
                <button
                  className={styles.btn}
                  onClick={() => navigate("/auth")}
                >
                  Go to sign in <ArrowRight size={16} />
                </button>
              </Motion.div>
            )}

          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
