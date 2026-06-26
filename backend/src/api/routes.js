import express from "express";
import authRoutes from "./auth/routes/auth.routes.js";
import questionRoutes from "./questions/routes/question.routes.js";
import answerRoutes from "./answers/routes/answer.routes.js";
import ragRoutes from "./rag/routes/rag.routes.js";
import moderationRoutes from "./moderation/routes/moderation.routes.js";

export const mainRouter = express.Router();

// Authentication routes
mainRouter.use("/auth", authRoutes);

// Question routes
mainRouter.use("/questions", questionRoutes);

// Answer routes
mainRouter.use("/answers", answerRoutes);

//Rag routes
mainRouter.use("/rag", ragRoutes);

// Moderation routes
mainRouter.use("/moderation", moderationRoutes);


