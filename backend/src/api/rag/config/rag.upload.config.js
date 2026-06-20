// backend/src/api/rag/config/rag.upload.config.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { BadRequestError } from "../../../utils/errors/index.js";


const RAG_UPLOAD_DIR = process.env.RAG_UPLOAD_DIR || "uploads/rag";
const uploadDir = path.resolve(process.cwd(), RAG_UPLOAD_DIR);


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Constants from env ────────────────────────
const MAX_UPLOAD_BYTES =
  (parseInt(process.env.RAG_MAX_UPLOAD_MB, 10) || 5) * 1024 * 1024;

// ── Storage engine ────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },


  filename: (req, file, cb) => {
    const userId = req.user?.id || "unknown";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${userId}-${timestamp}-${random}${ext}`);
  },
});

// ── File filter — PDF only ────────────────────
const fileFilter = (_req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" ||
    path.extname(file.originalname).toLowerCase() === ".pdf";

  if (!isPdf) {
    // Pass error to cb — multer will attach it to req
    return cb(new BadRequestError("Only PDF files are allowed."));
  }

  cb(null, true);
};

// ── Multer instance ───────────────────────────
export const ragUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1, // one file per request
  },
});


export function createDocumentMulterErrorHandler(err, req, res, next) {
  if (err?.code === "LIMIT_FILE_SIZE") {
    const mb = process.env.RAG_MAX_UPLOAD_MB || 5;
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum allowed size is ${mb}MB.`,
    });
  }

  if (err?.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Only one file can be uploaded at a time.",
    });
  }

  if (err?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: 'File must be uploaded under the field name "file".',
    });
  }

  // BadRequestError from fileFilter (wrong mime type)
  if (err?.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Not a multer error — pass to global error handler
  next(err);
}
