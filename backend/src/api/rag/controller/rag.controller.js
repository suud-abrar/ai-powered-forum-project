import { StatusCodes } from "http-status-codes";
import {
  searchDocumentService,
  queryDocumentService,
} from "../service/rag.service.js";

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
