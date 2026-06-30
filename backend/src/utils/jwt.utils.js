import jwt from "jsonwebtoken";

/**
 * Generate JWT token
 * @param {Object} payload - Data to encode in token (e.g., { id, email })
 * @param {string} expiresIn - Token expiration time (default: '7d')
 * @returns {string} - JWT token
 */
export const generateToken = (payload, expiresIn = "7d") => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  try {
    const token = jwt.sign(payload, secret, { expiresIn });
    return token;
  } catch (error) {
    console.error("Token generation failed:", error.message);
    throw new Error("Failed to generate authentication token");
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded payload
 */
export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    throw new Error("Invalid or expired token");
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} - Decoded payload
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error("Invalid token format");
  }
};
