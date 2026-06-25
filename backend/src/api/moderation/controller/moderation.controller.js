
import {
  getPendingModerationItems,
  updateModerationStatus,
} from "../service/moderation.service.js";

// GET /api/moderation/queue
export const getModerationQueue = async (req, res) => {
  try {
    const data = await getPendingModerationItems();

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Moderation queue error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch moderation queue",
    });
  }
};

// PATCH /api/moderation/:itemId/resolve
export const resolveModerationItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { action } = req.body;

    if (!["approved", "removed"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use approved or removed",
      });
    }

    const result = await updateModerationStatus(itemId, action);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Item ${action} successfully`,
    });
  } catch (err) {
    console.error("Moderation resolve error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to resolve moderation item",
    });
  }
};