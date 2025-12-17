const { verifyToken } = require("../services/authService");
const { errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * JWT authentication middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Authentication token required", 401);
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      logger.warn("Invalid token:", error.message);
      return errorResponse(res, "Invalid or expired token", 401);
    }
  } catch (error) {
    logger.error("Authentication error:", error);
    return errorResponse(res, "Authentication failed", 401);
  }
};

/**
 * Role-based access control middleware
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, "Insufficient permissions", 403);
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Token invalid, but continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuthenticate,
};
