import { OAuth2Client } from 'google-auth-library';
import { safeExecute } from '../../../../db/config.js';

const googleClientId = process.env.GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.warn('⚠️  GOOGLE_CLIENT_ID is not set in environment variables');
}

const client = new OAuth2Client(googleClientId);

/**
 * Verify Google ID token and extract user info
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    return {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || 'User',
      lastName: payload.family_name || '',
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    console.error('Google token verification failed:', error.message);
    throw new Error('Invalid Google token. Please try again.');
  }
};

/**
 * Find existing or create new user account
 * Handles account linking if email already exists
 */
export const findOrCreateGoogleUser = async (googleUser) => {
  try {
    // Check if user exists by email
    const existingUserRows = await safeExecute(
      'SELECT user_id, first_name, last_name, email FROM users WHERE email = ? LIMIT 1',
      [googleUser.email]
    );

    if (existingUserRows.length > 0) {
      const existingUser = existingUserRows[0];

      // Link Google account if not already linked
      await safeExecute(
        'UPDATE users SET google_id = ? WHERE user_id = ? AND google_id IS NULL',
        [googleUser.googleId, existingUser.user_id]
      );

      return {
        user: {
          id: existingUser.user_id,
          email: existingUser.email,
          firstName: existingUser.first_name,
          lastName: existingUser.last_name,
        },
        isNewUser: false,
      };
    }

    // Create new user account
    const result = await safeExecute(
      `INSERT INTO users (first_name, last_name, email, google_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [googleUser.firstName, googleUser.lastName, googleUser.email, googleUser.googleId]
    );

    return {
      user: {
        id: result.insertId,
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
      },
      isNewUser: true,
    };
  } catch (error) {
    console.error('Database error:', error.message);
    throw new Error('Failed to create or link account. Please try again.');
  }
};

/**
 * Complete Google authentication flow
 */
export const authenticateWithGoogle = async (idToken) => {
  const googleUser = await verifyGoogleToken(idToken);
  return findOrCreateGoogleUser(googleUser);
};