const connectionService = require("../services/connectionService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const {
  validateConnectionRequest,
} = require("../validators/purchaseValidator");
const logger = require("../utils/logger");
const { getTeacherById } = require("../services/teacherService");

/**
 * Send connection request
 */
exports.sendConnectionRequest = async (req, res) => {
  try {
    const validation = validateConnectionRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const requestId = await connectionService.sendConnectionRequest(req.body);

    return successResponse(
      res,
      {
        message: "Connection request sent successfully",
        requestId,
      },
      201
    );
  } catch (error) {
    logger.error("Error sending connection request:", error);
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, "Failed to send connection request", 500);
  }
};

/**
 * Get connection requests for teacher
 */
exports.getConnectionRequestsForTeacher = async (req, res) => {
  try {
    const teacherId = req?.user?.id;

    console.log("Teacher ID:", teacherId);

    // get teacher by id
    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      return errorResponse(res, "Teacher not found", 404);
    }
    const requests = await connectionService.getConnectionRequestsForTeacher(
      teacherId
    );

    return successResponse(res, requests);
  } catch (error) {
    logger.error("Error fetching connection requests:", error);
    return errorResponse(res, "Failed to fetch connection requests", 500);
  }
};

/**
 * Get connection request count for teacher
 */
exports.getConnectionRequestCount = async (req, res) => {
  try {
    const teacherId = req?.user?.id;

    // get teacher by id
    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      return errorResponse(res, "Teacher not found", 404);
    }
    const count = await connectionService.getConnectionRequestCount(teacherId);

    return successResponse(res, count);
  } catch (error) {
    logger.error("Error fetching connection request count:", error);
    return errorResponse(res, "Failed to fetch connection request count", 500);
  }
};

/**
 * Get specific connection request
 */
exports.getConnectionRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await connectionService.getConnectionRequestById(requestId);

    return successResponse(res, request);
  } catch (error) {
    logger.error("Error fetching connection request:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch connection request", 500);
  }
};

/**
 * Purchase connection request
 */
exports.purchaseConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return errorResponse(res, "Teacher ID is required", 400);
    }

    await connectionService.purchaseConnectionRequest(requestId, teacherId);

    return successResponse(res, {
      message: "Connection request purchased successfully",
    });
  } catch (error) {
    logger.error("Error purchasing connection request:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to purchase connection request", 500);
  }
};

/**
 * Get request status for student
 */
exports.getRequestStatus = async (req, res) => {
  try {
    const { postId, studentId } = req.params;
    const status = await connectionService.getRequestStatus(postId, studentId);

    return successResponse(res, status);
  } catch (error) {
    logger.error("Error checking request status:", error);
    return errorResponse(res, "Failed to check request status", 500);
  }
};
