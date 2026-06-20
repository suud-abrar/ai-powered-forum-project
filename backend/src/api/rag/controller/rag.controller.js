// backend/src/api/rag/controller/rag.controller.js
import { StatusCodes } from "http-status-codes";
import path from "path";
import { fileURLToPath } from "url";
import {
  createDocumentFromUploadService,
  searchDocumentService,
  queryDocumentService,
  getDocumentMetaService,
  assertOwnedDocument,
  listDocumentsForUserService,
  deleteDocumentService,
} from "../service/rag.service.js";
export async function createDocumentController(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please attach a PDF file.",
      });
    }

    const userId = req.user.id;

    const document = await createDocumentFromUploadService({
      userId,
      file: req.file,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded and processed.",
      data: document,
      });
  } catch (error) {
    next(error);
  }
};


export const searchDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query, k = 5 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "query is required",
      });
    }

    const results = await searchDocumentService({
      documentId,
      query,
      k: Number(k),
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Document search completed successfully",
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

export const queryDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query } = req.body;

    const result = await queryDocumentService({
      documentId,
      query,
      userId: req.user.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "AI grounded answer generated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// suud's part
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id; // set by authenticateUser middleware

    const document = await getDocumentMetaService(Number(documentId), userId);

    return res.status(200).json({
      success: true,
      message: "Document fetched successfully.",
      data: {
        document_id: document.document_id,
        title: document.title,
        mime_type: document.mime_type,
        byte_size: document.byte_size,
        status: document.status,
        error_message: document.error_message,
        created_at: document.created_at,
        updated_at: document.updated_at,
        user_id: document.user_id,
        storage_path: document.storage_path,
      },
    });
  } catch (error) {
    next(error); // NotFoundError handled by error-handler.js
  }
};
// needed for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... existing getDocumentMetaController above ...

export const getDocumentFileController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    // 1. Verify ownership and get storage_path
    const document = await assertOwnedDocument(Number(documentId), userId);

    // 2. Resolve absolute path on disk
    // storage_path is like "1/1234-abc.pdf"
    // files are stored in backend/uploads/
    const absolutePath = path.resolve(
      __dirname,
      "../../../../uploads/rag",
      document.storage_path,
    );

    // 3. Stream the PDF back to the client
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.title}"`,
    );

    return res.sendFile(absolutePath, {}, (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listDocumentsController = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch all documents for this user
    const documents = await listDocumentsForUserService(userId);

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully.",
      data: documents.map((doc) => ({
        document_id: doc.document_id,
        title: doc.title,
        mime_type: doc.mime_type,
        byte_size: doc.byte_size,
        status: doc.status,
        error_message: doc.error_message,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const result = await deleteDocumentService(Number(documentId), userId);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      data: { id: result.id },
    });
  } catch (error) {
    next(error);
  }
};
