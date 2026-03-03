const reviewTokenService = require("../services/reviewTokenService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

exports.generateToken = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const result = await reviewTokenService.generateReviewToken(teacherId);
    return successResponse(res, result, 201);
  } catch (error) {
    logger.error("Error generating review token:", error);
    return errorResponse(res, "Failed to generate review link", 500);
  }
};

exports.getMyTokens = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const tokens = await reviewTokenService.getTeacherTokens(teacherId);
    return successResponse(res, tokens);
  } catch (error) {
    logger.error("Error fetching review tokens:", error);
    return errorResponse(res, "Failed to fetch review links", 500);
  }
};

exports.deactivateToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const teacherId = req.user.id;
    await reviewTokenService.deactivateToken(tokenId, teacherId);
    return successResponse(res, { message: "Review link deactivated" });
  } catch (error) {
    logger.error("Error deactivating review token:", error);
    return errorResponse(res, error.message || "Failed to deactivate review link", 400);
  }
};

exports.validatePublicToken = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await reviewTokenService.validateToken(token);

    if (!result.valid) {
      return errorResponse(res, result.reason, 400);
    }

    return successResponse(res, {
      teacherId: result.teacherId,
      teacherName: result.teacherName,
    });
  } catch (error) {
    logger.error("Error validating public review token:", error);
    return errorResponse(res, "Failed to validate review link", 500);
  }
};

exports.submitPublicReview = async (req, res) => {
  try {
    const { token } = req.params;
    const { reviewerName, rating, reviewText } = req.body;

    if (!reviewerName || !reviewerName.trim()) {
      return errorResponse(res, "Your name is required", 400);
    }

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, "Rating must be between 1 and 5", 400);
    }

    const result = await reviewTokenService.submitPublicReview({
      token,
      reviewerName: reviewerName.trim(),
      rating: parseInt(rating),
      reviewText: reviewText?.trim() || null,
    });

    return successResponse(res, {
      message: "Review submitted successfully!",
      reviewId: result.id,
    }, 201);
  } catch (error) {
    logger.error("Error submitting public review:", error);
    return errorResponse(res, error.message || "Failed to submit review", 400);
  }
};
