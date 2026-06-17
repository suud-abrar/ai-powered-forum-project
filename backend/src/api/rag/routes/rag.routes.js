import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { searchDocumentController } from "../controller/rag.controller.js";

const router = express.Router();

router.get(
  "/documents/:documentId/search",
  authenticateUser,
  searchDocumentController,
);

export default router; // Hello, there
