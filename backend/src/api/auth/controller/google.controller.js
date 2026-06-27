import { authenticateWithGoogle } from "../service/google.service.js";
import { generateToken } from "../../../utils/jwt.utils.js";

/**
 * POST /api/auth/google
 * Authenticate user with Google ID token
 */
export const googleAuthController = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required.",
      });
    }

    // Authenticate with Google and get/create user
    const { user, isNewUser } = await authenticateWithGoogle(idToken);

    // Generate our own JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    // Return success response
    res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? "Account created successfully"
        : "Sign in successful",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
