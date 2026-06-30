import { StatusCodes } from "http-status-codes";
import { registerService, loginService } from "../service/auth.service.js";
import {
  forgotPasswordService,
  verifyResetCodeService,
  resetPasswordService,
} from "../service/auth.service.js"; 

/**
 * Handles user registration requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const registerController = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const newUser = await registerService({
      firstName,
      lastName,
      email,
      password,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully.",
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user login requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const authResult = await loginService({ email, password });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Login successful.",
      user: authResult.user,
      token: authResult.token,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController = (req, res) => {
  // JWT is stateless — logout is handled on frontend
  // Backend just confirms the request
  return res.status(200).json({
    success: true,
    msg: "Logged out successfully",
  });
};


// ── Forgot Password ───────────────────────────────────────────────────────

export const forgotPasswordController = async (req, res, next) => {
  try {
    const { email } = req.body;
    await forgotPasswordService(email);

    // Always return success — don't reveal if email exists
    return res.status(200).json({
      success: true,
      message: "If that email exists, a reset code has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// ── Verify Reset Code ─────────────────────────────────────────────────────

export const verifyResetCodeController = async (req, res, next) => {
  console.log("verifyResetCodeController called with body:", req.body);
  try {
    const { email, code } = req.body;
    const resetToken = await verifyResetCodeService(email, code);

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Code verified successfully.",
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────

export const resetPasswordController = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    const result = await resetPasswordService(resetToken, newPassword);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};