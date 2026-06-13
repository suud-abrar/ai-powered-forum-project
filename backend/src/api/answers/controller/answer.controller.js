// backend/src/api/answers/answer.controller.js
import { createAnswerService } from "../service/answer.service.js";

async function createAnswerController(req, res, next) {
  try {
    const { questionId, content } = req.body;
    const userId = req.user.id;
    // ↑ from JWT via authenticateUser — trusted source
    // never from req.body — untrusted user input

    const answer = await createAnswerService({
      questionId,
      userId,
      content,
    });

    // 201 Created — not 200 OK
    // 201 specifically means a new resource was created.
    // Using 200 for a creation is technically incorrect.
    return res.status(201).json({
      success: true,
      message: "Answer posted successfully",
      data: answer,
    });
  } catch (error) {
    next(error);
  }
}

export { createAnswerController };
