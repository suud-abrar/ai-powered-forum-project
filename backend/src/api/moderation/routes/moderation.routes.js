import express from "express";
import {
  getModerationQueue,
  resolveModerationItem,
} from "../controller/moderation.controller.js";
import { authenticateUser } from "../../../middleware/authentication.js";
import { isModerator } from "../../../middleware/roleHandler.js";

const router = express.Router();

// GET /api/moderation/queue
router.get("/queue", authenticateUser, isModerator, getModerationQueue);
// PATCH /api/moderation/:itemId/resolve
router.patch(
  "/:itemId/resolve",
  authenticateUser,
  isModerator,
  resolveModerationItem,
);

export default router;
