import express from "express";
import {
  registerController,
  loginController,
  logoutController,
  forgotPasswordController,
  verifyResetCodeController,
  resetPasswordController,
} from "../controller/auth.controller.js";
import {
  registerValidation,
  loginValidation,
  validateGoogleAuth, 
} from "../validations/auth.validation.js";
import { authenticateUser } from "../../../middleware/authentication.js";
import googleRoutes from "./google.routes.js";

const router = express.Router(); 

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", registerValidation, registerController);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post("/login", loginValidation, loginController);
router.post("/logout", authenticateUser, logoutController);

// forgot password
router.post("/forgot-password", forgotPasswordController);
router.post("/verify-reset-code", verifyResetCodeController);
router.post("/reset-password", resetPasswordController);
// Google OAuth routes
router.use("/google", googleRoutes); 

export default router;
