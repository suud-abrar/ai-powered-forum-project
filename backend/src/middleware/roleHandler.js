export const isModerator = (req, res, next) => {
  try {
    // req.user should already be set by authentication middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "moderator") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Moderator access required",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Role check failed",
    });
  }
};
