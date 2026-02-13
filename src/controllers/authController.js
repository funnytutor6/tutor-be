const authService = require("../services/authService");
const { executeQuery } = require("../services/databaseService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const {
  validateTeacherRegistration,
  validateStudentRegistration,
  validateLogin,
} = require("../validators/authValidator");
const logger = require("../utils/logger");

/**
 * Register a teacher
 */
exports.registerTeacher = async (req, res) => {
  try {
    const validation = validateTeacherRegistration(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const result = await authService.registerTeacher(req.body);

    return res.status(201).json({
      success: true,
      message:
        "Tutor registered successfully. Please verify your email address.",
      teacherId: result.teacherId,
      teacher: result.teacher,
      requiresEmailVerification: true,
    });
  } catch (error) {
    logger.error("Error registering teacher:", error);
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, "Failed to register Tutor", 500);
  }
};

/**
 * Login a teacher
 */
exports.loginTeacher = async (req, res) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const { email, password } = req.body;
    const result = await authService.loginTeacher(email, password);

    return res.json({
      success: true,
      message: "Login successful",
      token: result.token,
      teacher: result.teacher,
    });
  } catch (error) {
    logger.error("Error during Tutor login:", error);
    console.log("error", error?.message);

    // If email verification is required, return user data for email verification
    if (error.requiresEmailVerification) {
      return res.status(401).json({
        success: false,
        error: error.message,
        requiresEmailVerification: true,
        userId: error.userId,
        email: error.email,
        userName: error.userName,
        userType: error.userType,
      });
    }

    // If phone verification is required, return user data for OTP verification
    if (error.requiresOTPVerification) {
      return res.status(401).json({
        success: false,
        error: error.message,
        requiresOTPVerification: true,
        userId: error.userId,
        phoneNumber: error.phoneNumber,
        userType: error.userType,
      });
    }

    if (
      error.message.includes("Invalid") ||
      error.message.includes("rejected") ||
      error.message.includes("verify")
    ) {
      return errorResponse(res, error.message, 401);
    }

    return errorResponse(res, error.message || "Failed to login", 500);
  }
};

/**
 * Register a student
 */
exports.registerStudent = async (req, res) => {
  try {
    const validation = validateStudentRegistration(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const result = await authService.registerStudent(req.body);
    console.log("result", result);

    return res.status(201).json({
      success: true,
      message:
        "Student registered successfully. Please verify your email address.",
      studentId: result.studentId,
      student: result.student,
      requiresEmailVerification: true,
    });
  } catch (error) {
    logger.error("Error registering student:", error);
    if (
      error.message.includes("already exists") ||
      error.message.includes("required")
    ) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, "Failed to register student", 500);
  }
};

/**
 * Complete teacher registration after OTP verification
 */
exports.completeTeacherRegistration = async (req, res) => {
  try {
    const { teacherId } = req.body;

    if (!teacherId) {
      return errorResponse(res, "teacherId is required", 400);
    }

    const result = await authService.completeTeacherRegistration(teacherId);

    return res.json({
      success: true,
      message: "Registration completed successfully",
      token: result.token,
      teacher: result.teacher,
    });
  } catch (error) {
    logger.error("Error completing teacher registration:", error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Complete student registration after OTP verification
 */
exports.completeStudentRegistration = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return errorResponse(res, "studentId is required", 400);
    }

    const result = await authService.completeStudentRegistration(studentId);

    return res.json({
      success: true,
      message: "Registration completed successfully",
      token: result.token,
      student: result.student,
    });
  } catch (error) {
    logger.error("Error completing student registration:", error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Login a student
 */
exports.loginStudent = async (req, res) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const { email, password } = req.body;
    const result = await authService.loginStudent(email, password);

    return res.json({
      success: true,
      message: "Login successful",
      token: result.token,
      student: result.student,
    });
  } catch (error) {
    logger.error("Error during student login:", error);

    // If email verification is required, return user data for email verification
    if (error.requiresEmailVerification) {
      return res.status(401).json({
        success: false,
        error: error.message,
        requiresEmailVerification: true,
        userId: error.userId,
        email: error.email,
        userName: error.userName,
        userType: error.userType,
      });
    }

    // If phone verification is required, return user data for OTP verification
    if (error.requiresOTPVerification) {
      return res.status(401).json({
        success: false,
        error: error.message,
        requiresOTPVerification: true,
        userId: error.userId,
        phoneNumber: error.phoneNumber,
        userType: error.userType,
      });
    }

    if (
      error.message.includes("Invalid") ||
      error.message.includes("rejected") ||
      error.message.includes("verify")
    ) {
      return errorResponse(res, error.message, 401);
    }
    return errorResponse(res, error.message || "Failed to login", 500);
  }
};

/**
 * Login an admin
 */
exports.loginAdmin = async (req, res) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const { email, password } = req.body;
    const result = await authService.loginAdmin(email, password);

    return res.json({
      success: true,
      message: "Login successful",
      token: result.token,
      admin: result.admin,
    });
  } catch (error) {
    logger.error("Error during admin login:", error);
    if (error.message.includes("Invalid")) {
      return errorResponse(res, error.message, 401);
    }
    return errorResponse(res, "Failed to login", 500);
  }
};

/**
 * Forgot password - Send OTP to email
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return errorResponse(res, "Email and userType are required", 400);
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'student' or 'teacher'", 400);
    }

    // Find user by email
    const { executeQuery } = require("../services/databaseService");
    const userQuery =
      userType === "student"
        ? "SELECT id, name, email FROM Students WHERE email = ?"
        : "SELECT id, name, email FROM Teachers WHERE email = ?";
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      // Don't reveal if email exists for security
      return successResponse(
        res,
        { message: "If the email exists, an OTP has been sent." },
        200,
      );
    }

    const user = users[0];

    // Send password reset OTP
    const otpService = require("../services/otpService");
    const result = await otpService.sendPasswordResetOTP(
      user.id,
      userType,
      email,
    );

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error in forgot password:", error);
    if (error.message.includes("wait")) {
      return errorResponse(res, error.message, 400);
    }
    // Don't reveal if email exists for security
    return successResponse(
      res,
      { message: "If the email exists, an OTP has been sent." },
      200,
    );
  }
};

/**
 * Reset password - Verify OTP and update password
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, userType, otpCode, newPassword } = req.body;

    if (!email || !userType || !otpCode || !newPassword) {
      return errorResponse(
        res,
        "Email, userType, otpCode, and newPassword are required",
        400,
      );
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'student' or 'Tutor'", 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(
        res,
        "Password must be at least 6 characters long",
        400,
      );
    }

    // Find user by email
    const { executeQuery } = require("../services/databaseService");
    const userQuery =
      userType === "student"
        ? "SELECT id, name, email FROM Students WHERE email = ?"
        : "SELECT id, name, email FROM Teachers WHERE email = ?";
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      return errorResponse(res, "User not found", 404);
    }

    const user = users[0];

    // Verify OTP
    const otpService = require("../services/otpService");
    await otpService.verifyPasswordResetOTP(user.id, userType, email, otpCode);

    // Update password
    const { hashPassword } = require("../services/authService");
    const hashedPassword = await hashPassword(newPassword);

    const updateQuery =
      userType === "student"
        ? "UPDATE Students SET password = ?, updated = NOW() WHERE id = ?"
        : "UPDATE Teachers SET password = ?, updated = NOW() WHERE id = ?";
    await executeQuery(updateQuery, [hashedPassword, user.id]);

    // Send success email
    const emailService = require("../services/emailService");
    await emailService.sendPasswordResetSuccessEmail({
      email: user.email,
      name: user.name,
    });

    logger.info(`Password reset successful for ${userType}: ${email}`);

    return successResponse(res, {
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error("Error in reset password:", error);
    if (
      error.message.includes("not found") ||
      error.message.includes("expired") ||
      error.message.includes("Invalid") ||
      error.message.includes("exceeded")
    ) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, "Failed to reset password", 500);
  }
};

/**
 * Verify email address with OTP code
 * POST /api/auth/verify-email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { userId, userType, email, otpCode } = req.body;

    if (!userId || !userType || !email || !otpCode) {
      return errorResponse(
        res,
        "userId, userType, email, and otpCode are required",
        400,
      );
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'student' or 'teacher'", 400);
    }

    const result = await authService.verifyEmailToken(
      userId,
      userType,
      email,
      otpCode,
    );

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error verifying email:", error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Resend email verification code
 * POST /api/auth/resend-email-verification
 */
exports.resendEmailVerification = async (req, res) => {
  try {
    const { userId, userType, email } = req.body;

    if (!userId || !userType || !email) {
      return errorResponse(
        res,
        "userId, userType, and email are required",
        400,
      );
    }

    if (!["student", "teacher"].includes(userType)) {
      return errorResponse(res, "userType must be 'student' or 'teacher'", 400);
    }

    const result = await authService.resendEmailVerification(
      userId,
      userType,
      email,
    );

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error resending email verification:", error);
    return errorResponse(res, error.message, 400);
  }
};
