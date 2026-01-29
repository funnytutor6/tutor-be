const otpService = require("../services/otpService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Send OTP to user's phone number
 */
exports.sendOTP = async (req, res) => {
  try {
    const { userId, userType, phoneNumber } = req.body;

    if (!userId || !userType || !phoneNumber) {
      return errorResponse(
        res,
        "userId, userType, and phoneNumber are required",
        400
      );
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'student' or 'Tutor'", 400);
    }

    const result = await otpService.sendOTP(userId, userType, phoneNumber);

    console.log("result", result);
    return successResponse(res, result);
  } catch (error) {
    logger.error("Error sending OTP:", error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Verify OTP code
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, userType, phoneNumber, otpCode } = req.body;

    if (!userId || !userType || !phoneNumber || !otpCode) {
      return errorResponse(
        res,
        "userId, userType, phoneNumber, and otpCode are required",
        400
      );
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'Student' or 'Tutor'", 400);
    }

    await otpService.verifyOTP(userId, userType, phoneNumber, otpCode);

    return successResponse(res, { verified: true }, 200);
  } catch (error) {
    logger.error("Error verifying OTP:", error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Get OTP status (for checking cooldown, expiry, etc.)
 */
exports.getOTPStatus = async (req, res) => {
  try {
    const { userId, userType, phoneNumber } = req.query;

    if (!userId || !userType || !phoneNumber) {
      return errorResponse(
        res,
        "userId, userType, and phoneNumber are required",
        400
      );
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'Student' or 'Tutor'", 400);
    }

    const status = await otpService.getOTPStatus(userId, userType, phoneNumber);

    return successResponse(res, status);
  } catch (error) {
    logger.error("Error getting OTP status:", error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Check if phone number is verified
 */
exports.checkPhoneVerified = async (req, res) => {
  try {
    const { userId, userType, phoneNumber } = req.query;

    if (!userId || !userType || !phoneNumber) {
      return errorResponse(
        res,
        "userId, userType, and phoneNumber are required",
        400
      );
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'Student' or 'Tutor'", 400);
    }

    const isVerified = await otpService.isPhoneVerified(
      userId,
      userType,
      phoneNumber
    );

    return successResponse(res, { isVerified });
  } catch (error) {
    logger.error("Error checking phone verification:", error);
    return errorResponse(res, error.message, 400);
  }
};
