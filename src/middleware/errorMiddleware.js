const { errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error("Error:", err);

  // Handle known error types
  if (err.name === "ValidationError") {
    return errorResponse(res, err.message, 400);
  }

  if (err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
    return errorResponse(res, "Invalid or expired token", 401);
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return errorResponse(res, message, statusCode, process.env.NODE_ENV === "development" ? err.stack : null);
};

/**
 * 404 Not Found middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const notFound = (req, res, next) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = {
  errorHandler,
  notFound,
};

