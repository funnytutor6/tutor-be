/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Number} statusCode - HTTP status code (default: 200)
 * @returns {Object} - Express response
 */
const successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data: data || null,
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {*} details - Additional error details (optional)
 * @returns {Object} - Express response
 */
const errorResponse = (res, message, statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: message,
  };

  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Object|Array} errors - Validation errors
 * @returns {Object} - Express response
 */
const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: "Validation failed",
    errors,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
};
