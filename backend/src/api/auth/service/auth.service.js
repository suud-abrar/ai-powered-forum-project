import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordResetEmail } from "./email.service.js";
import { safeExecute } from "../../../../db/config.js";
import {
  BadRequestError,
  UnauthenticatedError,
} from "../../../utils/errors/index.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const normalizeEmail = (email) => email.trim().toLowerCase();

/**
 * Checks if a user exists by email.
 *
 * @param {string} email - The email to check.
 * @returns {Promise<boolean>} True if the user exists, false otherwise.
 */
export const checkUserExists = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const sql = "SELECT user_id FROM users WHERE email = ? LIMIT 1";
  const rows = await safeExecute(sql, [normalizedEmail]);
  return rows.length > 0;
};

/**
 * Registers a new user in the database.
 *
 * @param {Object} userData - The user data.
 * @param {string} userData.firstName - The first name.
 * @param {string} userData.lastName - The last name.
 * @param {string} userData.email - The email address.
 * @param {string} userData.password - The plain text password.
 * @returns {Promise<Object>} The created user object (without password).
 */
export const registerService = async ({
  firstName,
  lastName,
  email,
  password,
}) => {
  const normalizedEmail = normalizeEmail(email);
  const userExists = await checkUserExists(normalizedEmail);
  if (userExists) {
    throw new BadRequestError("User already exists with this email.");
  }

  // every time we call bcrypt.genSalt, it generates a new random salt string.
  const salt = await bcrypt.genSalt(10); // generates a unique random salt each call
  const hashedPassword = await bcrypt.hash(password, salt);
  const sql =
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)";
  let result;
  try {
    result = await safeExecute(sql, [
      firstName,
      lastName,
      normalizedEmail,
      hashedPassword,
    ]);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw new BadRequestError("User already exists with this email.");
    }
    throw error;
  }

  return {
    id: result.insertId,
    firstName,
    lastName,
    email: normalizedEmail,
  };
};

/**
 * Authenticates a user and generates a JWT token.
 *
 * @param {Object} credentials - The login credentials.
 * @param {string} credentials.email - The user's email.
 * @param {string} credentials.password - The user's plain text password.
 * @returns {Promise<Object>} An object containing the user and token.
 * @throws {UnauthenticatedError} If authentication fails.
 */
export const loginService = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const sql =
    "SELECT user_id, first_name, last_name, email, password_hash, role FROM users WHERE email = ? LIMIT 1";
  const rows = await safeExecute(sql, [normalizedEmail]);

  if (rows.length === 0) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const payload = {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    user: {
      id: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

// ── Forgot Password ───────────────────────────────────────────────────────

export async function forgotPasswordService(email) {
  // 1. Check user exists
  const users = await safeExecute(`SELECT user_id FROM users WHERE email = ?`, [
    email,
  ]);

  if (!users.length) {
    // Don't reveal whether email exists — just return silently
    return;
  }

  const userId = users[0].user_id;

  // 2. Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Hash the code
  const codeHash = await bcrypt.hash(code, 10);

  // 4. Set expiry — 15 minutes from now
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toLocaleString(
    "sv-SE",
  );

  // 5. Delete any existing reset entries for this user
  await safeExecute(`DELETE FROM password_resets WHERE user_id = ?`, [userId]);

  // 6. Store hashed code + expiry
  await safeExecute(
    `INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES (?, ?, ?)`,
    [userId, codeHash, expiresAt],
  );

  // 7. Send email
  await sendPasswordResetEmail(email, code);
}

// ── Verify Reset Code ─────────────────────────────────────────────────────

export async function verifyResetCodeService(email, code) {
  // 1. Get user
  const users = await safeExecute(`SELECT user_id FROM users WHERE email = ?`, [
    email,
  ]);

  if (!users.length) {
    return null;
  }

  const userId = users[0].user_id;

  // 2. Get the reset record
  const resets = await safeExecute(
    `SELECT * FROM password_resets 
     WHERE user_id = ? AND used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  if (!resets.length) {
    return null; // expired or doesn't exist
  }

  const reset = resets[0];

  // 3. Compare submitted code against stored hash
  const isMatch = await bcrypt.compare(code, reset.code_hash);

  if (!isMatch) {
    return null;
  }

  // 4. Generate a short-lived reset token (10 minutes)
  const resetToken = jwt.sign(
    { userId, resetId: reset.id },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );

  // 5. Hash the token and store it so it can be validated later
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  await safeExecute(
    `UPDATE password_resets SET reset_token_hash = ? WHERE id = ?`,
    [resetTokenHash, reset.id],
  );

  return resetToken;
}

// ── Reset Password ────────────────────────────────────────────────────────

export async function resetPasswordService(resetToken, newPassword) {
  // 1. Verify the JWT
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    return null; // expired or invalid token
  }

  const { userId, resetId } = payload;

  // 2. Hash the incoming token and check it matches what's stored
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resets = await safeExecute(
    `SELECT * FROM password_resets 
     WHERE id = ? AND user_id = ? AND reset_token_hash = ? AND used = 0`,
    [resetId, userId, resetTokenHash],
  );

  if (!resets.length) {
    return null;
  }

  // 3. Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // 4. Update the user's password
  await safeExecute(`UPDATE users SET password_hash = ? WHERE user_id = ?`, [
    passwordHash,
    userId,
  ]);

  // 5. Mark the reset record as used so it can't be reused
  await safeExecute(`UPDATE password_resets SET used = 1 WHERE id = ?`, [
    resetId,
  ]);

  return true;
}
