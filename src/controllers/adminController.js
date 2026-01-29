const adminService = require("../services/adminService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");
const {
  getPaginatedTeacherPosts,
  getPaginatedStudents,
  getPaginatedStudentPosts,
  getTeacherPostWithDetails,
  getStudentWithDetails,
  getStudentPostWithDetails,
} = require("../services/adminPostService");
const { validatePaginationSearch } = require("../validators/adminValidator");

/**
 * Get all teachers (with optional status filter)
 * GET /api/admin/teachers?status=pending
 */
exports.getAllTeachers = async (req, res) => {
  try {
    const validation = validatePaginationSearch(req.query);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const { page, pageSize, search } = validation.value;
    const teachers = await adminService.getAllTeachers({
      page,
      pageSize,
      search,
    });

    return successResponse(res, teachers);
  } catch (error) {
    logger.error("Error fetching all teachers:", error);
    return errorResponse(res, "Failed to fetch teachers", 500);
  }
};

/**
 * Get pending teachers only
 * GET /api/admin/teachers/pending
 */
exports.getPendingTeachers = async (req, res) => {
  try {
    const validation = validatePaginationSearch(req.query);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const { page, pageSize, search } = validation.value;
    const teachers = await adminService.getPendingTeachers({
      page,
      pageSize,
      search,
    });

    return successResponse(res, teachers);
  } catch (error) {
    logger.error("Error fetching pending teachers:", error);
    return errorResponse(res, "Failed to fetch pending teachers", 500);
  }
};

/**
 * Update  status
 * PUT /api/admin/teachers/:id/status
 * Body: { status: 'approved' | 'rejected' | 'pending' }
 */
exports.updateTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status) {
      return errorResponse(res, "Status is required", 400);
    }

    const teacher = await adminService.updateTeacherStatus(
      id,
      status,
      rejectionReason
    );

    return successResponse(
      res,
      {
        message: "Tutor status updated successfully",
        teacher,
      },
      200
    );
  } catch (error) {
    logger.error("Error updating teacher status:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    if (error.message.includes("Invalid status")) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, "Failed to update Tutor status", 500);
  }
};

/**
 * Get all teacher posts for admin with pagination & search
 * GET /api/admin/teacher-posts?page=1&pageSize=20&search=math
 */
exports.getAllTeacherPostsForAdmin = async (req, res) => {
  try {
    const validation = validatePaginationSearch(req.query);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const { page, pageSize, search } = validation.value;

    const result = await getPaginatedTeacherPosts({ page, pageSize, search });

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching teacher posts for admin:", error);
    return errorResponse(res, "Failed to fetch Tutor posts", 500);
  }
};

/**
 * Get all students for admin with pagination & search
 * GET /api/admin/students?page=1&pageSize=20&search=john
 */
exports.getAllStudentsForAdmin = async (req, res) => {
  try {
    const validation = validatePaginationSearch(req.query);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const { page, pageSize, search } = validation.value;

    const result = await getPaginatedStudents({ page, pageSize, search });

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching students for admin:", error);
    return errorResponse(res, "Failed to fetch students", 500);
  }
};

/**
 * Get all student posts for admin with pagination & search
 * GET /api/admin/student-posts?page=1&pageSize=20&search=english
 */
exports.getAllStudentPostsForAdmin = async (req, res) => {
  try {
    const validation = validatePaginationSearch(req.query);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const { page, pageSize, search } = validation.value;

    const result = await getPaginatedStudentPosts({ page, pageSize, search });

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching student posts for admin:", error);
    return errorResponse(res, "Failed to fetch student posts", 500);
  }
};

/**
 * Get teacher post by ID with full teacher details
 * GET /api/admin/teacher-posts/:id
 */
exports.getTeacherPostWithDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Post ID is required", 400);
    }

    const result = await getTeacherPostWithDetails(id);

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching Tutor post details:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch Tutor post details", 500);
  }
};

/**
 * Get student by ID with premium status and post count
 * GET /api/admin/students/:id
 */
exports.getStudentWithDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Student ID is required", 400);
    }

    const result = await getStudentWithDetails(id);

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching student details:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch student details", 500);
  }
};

/**
 * Get student post by ID with full student details
 * GET /api/admin/student-posts/:id
 */
exports.getStudentPostWithDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Post ID is required", 400);
    }

    const result = await getStudentPostWithDetails(id);

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching student post details:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch student post details", 500);
  }
};

/**
 * Get admin dashboard metrics
 * GET /api/admin/dashboard/metrics
 */
exports.getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await adminService.getDashboardMetrics();

    return successResponse(res, metrics);
  } catch (error) {
    logger.error("Error fetching dashboard metrics:", error);
    return errorResponse(res, "Failed to fetch dashboard metrics", 500);
  }
};

/**
 * Get admin profile
 * GET /api/admin/profile
 */
exports.getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await adminService.getAdminById(adminId);

    return successResponse(res, admin);
  } catch (error) {
    logger.error("Error fetching admin profile:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch admin profile", 500);
  }
};

/**
 * Update admin profile (email and/or password)
 * PUT /api/admin/profile
 */
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { email, currentPassword, newPassword } = req.body;

    // Validate that at least one field is provided
    if (!email && !newPassword) {
      return errorResponse(res, "Email or new password is required", 400);
    }

    // If updating password, current password is required
    if (newPassword && !currentPassword) {
      return errorResponse(
        res,
        "Current password is required to update password",
        400
      );
    }

    const updatedAdmin = await adminService.updateAdminProfile(adminId, {
      email,
      currentPassword,
      newPassword,
    });

    return successResponse(res, updatedAdmin, 200);
  } catch (error) {
    logger.error("Error updating admin profile:", error);
    if (
      error.message.includes("not found") ||
      error.message.includes("already in use") ||
      error.message.includes("incorrect") ||
      error.message.includes("required")
    ) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, "Failed to update admin profile", 500);
  }
};

/**
 * Get all teacher subscriptions for admin
 * GET /api/admin/teacher-subscriptions
 */
exports.getAllTeacherSubscriptionsForAdmin = async (req, res) => {
  try {
    const validation = validatePaginationSearch(req.query);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const { page, pageSize, search } = validation.value;

    const result = await adminService.getAllTeacherSubscriptionsForAdmin({
      page,
      pageSize,
      search,
    });
    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching teacher subscriptions for admin:", error);
    return errorResponse(res, "Failed to fetch Tutor subscriptions", 500);
  }
};

/**
 * Get all premium students for admin
 * GET /api/admin/students/premium
 */
exports.getAllPremiumStudentsForAdmin = async (req, res) => {
  try {
    const validation = validatePaginationSearch(req.query);
    if (!validation.valid) {
      return errorResponse(res, validation.errors.join(", "), 400);
    }
    const { page, pageSize, search } = validation.value;

    const result = await adminService.getAllPremiumStudentsForAdmin({
      page,
      pageSize,
      search,
    });
    return successResponse(res, result);
  } catch (error) {
    logger.error("Error fetching premium students for admin:", error);
    return errorResponse(res, "Failed to fetch premium students", 500);
  }
};

/**
 * Get reports data
 * GET /api/admin/reports
 */
exports.getReportsData = async (req, res) => {
  try {
    const reports = await adminService.getReportsData();
    return successResponse(res, reports);
  } catch (error) {
    logger.error("Error fetching reports data:", error);
    return errorResponse(res, "Failed to fetch reports data", 500);
  }
};

