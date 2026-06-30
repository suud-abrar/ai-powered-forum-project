import express from "express";
import { googleAuthController } from "../controller/google.controller.js";
import { validateGoogleAuth } from "../validations/auth.validation.js";

const router = express.Router();

/**
 * POST /api/auth/google
 */
router.post("/", validateGoogleAuth, googleAuthController);

export default router;
