import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { searchDocumentController } from "../controller/rag.controller.js";
import { queryDocumentController } from "../controller/rag.controller.js";

const router = express.Router();

router.get(
  "/documents/:documentId/search",
  authenticateUser,
  searchDocumentController,
);

router.post(
  "/documents/:documentId/query",
  authenticateUser,
  queryDocumentController,
);

export default router; // Hello, there
