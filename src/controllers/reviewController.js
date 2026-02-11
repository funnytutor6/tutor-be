const reviewService = require("../services/reviewService");
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
