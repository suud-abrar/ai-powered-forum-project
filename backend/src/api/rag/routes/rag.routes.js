// backend/src/api/rag/routes/rag.routes.js
import express from "express";
import { Router } from "express";
import {
  ragUpload,
  createDocumentMulterErrorHandler,
} from "../config/rag.upload.config.js";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  createDocumentController,
  searchDocumentController,
  queryDocumentController,
  getDocumentMetaController,
  getDocumentFileController,
  listDocumentsController,
  deleteDocumentController,
} from "../controller/rag.controller.js";
import { documentIdParamValidation } from "../validations/rag.validation.js";


const router = Router();


router.post(
  "/documents",
  authenticateUser,
  ragUpload.single("file"),
  createDocumentMulterErrorHandler,
  createDocumentController,
  );

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

// T-24 - List All Documents
router.get("/documents", authenticateUser, listDocumentsController);
// T-24 - Get Document Metadata
router.get(
  "/documents/:documentId",
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController,
);

// T-24 - Stream Document PDF
router.get(
  "/documents/:documentId/file",
  authenticateUser,
  documentIdParamValidation,
  getDocumentFileController,
);

// T-24 - Delete Document
router.delete(
  "/documents/:documentId",
  authenticateUser,
  documentIdParamValidation,
  deleteDocumentController,
);

export default router;
