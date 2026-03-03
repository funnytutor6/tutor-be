const reviewService = require("../services/reviewService");
const reviewRemovalService = require("../services/reviewRemovalService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Create a new tutor review
 */
exports.createReview = async (req, res) => {
  try {
    const { teacherId, rating, reviewText } = req.body;
    const studentId = req.user.id;

    // Validate input
    if (!teacherId || !rating) {
      return errorResponse(res, "Teacher ID and rating are required", 400);
    }

    if (rating < 1 || rating > 5) {
      return errorResponse(res, "Rating must be between 1 and 5", 400);
    }

    // Check if student has already reviewed this teacher
    const hasReviewed = await reviewService.hasStudentReviewedTeacher(
      studentId,
      teacherId,
    );
    if (hasReviewed) {
      return errorResponse(res, "You have already reviewed this tutor", 400);
    }

    const reviewId = await reviewService.createReview({
      teacherId,
      studentId,
      rating,
      reviewText,
    });

    return successResponse(
      res,
      {
        message: "Review submitted successfully",
        reviewId,
      },
      201,
    );
  } catch (error) {
    logger.error("Error creating review:", error);
    return errorResponse(res, "Failed to submit review", 500);
  }
};

/**
 * Get all reviews for a specific teacher
 */
exports.getTeacherReviews = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const reviews = await reviewService.getReviewsByTeacherId(teacherId);
    const stats = await reviewService.getTeacherReviewStats(teacherId);

    console.log("teacherId", teacherId);
    console.log("reviews", reviews);
    console.log("stats", stats);

    return successResponse(res, {
      reviews,
      stats,
    });
  } catch (error) {
    logger.error("Error fetching teacher reviews:", error);
    return errorResponse(res, "Failed to fetch reviews", 500);
  }
};

/**
 * Get all reviews written by the current student
 */
exports.getStudentReviews = async (req, res) => {
  try {
    const studentId = req.user.id;
    const reviews = await reviewService.getReviewsByStudentId(studentId);

    return successResponse(res, reviews);
  } catch (error) {
    logger.error("Error fetching student reviews:", error);
    return errorResponse(res, "Failed to fetch your reviews", 500);
  }
};

/**
 * Request review removal (teacher only)
 * POST /api/reviews/removal-request
 * Body: { reviewId, reviewSource, reason }
 */
exports.requestReviewRemoval = async (req, res) => {
  try {
    const teacherId = req.user.teacherId || req.user.id;
    const { reviewId, reviewSource, reason } = req.body;

    if (!reviewId || !reviewSource || !reason?.trim()) {
      return errorResponse(res, "Review ID, source, and reason are required", 400);
    }

    const id = await reviewRemovalService.requestReviewRemoval({
      teacherId,
      reviewId,
      reviewSource,
      reason: reason.trim(),
    });

    return successResponse(res, {
      message: "Removal request submitted. Admin will review shortly.",
      requestId: id,
    }, 201);
  } catch (error) {
    logger.error("Error requesting review removal:", error);
    return errorResponse(res, error.message || "Failed to submit removal request", 400);
  }
};

/**
 * Get teacher's removal requests
 * GET /api/reviews/removal-requests
 */
exports.getMyRemovalRequests = async (req, res) => {
  try {
    const teacherId = req.user.teacherId || req.user.id;
    const requests = await reviewRemovalService.getTeacherRemovalRequests(teacherId);
    return successResponse(res, requests);
  } catch (error) {
    logger.error("Error fetching removal requests:", error);
    return errorResponse(res, "Failed to fetch removal requests", 500);
  }
};
