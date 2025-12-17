const teacherService = require("../services/teacherService");
const cloudinaryService = require("../services/cloudinaryService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Get teacher by ID
 */
exports.getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await teacherService.getTeacherById(id);

    return res.json({
      success: true,
      teacher,
    });
  } catch (error) {
    logger.error("Error fetching teacher:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch teacher", 500);
  }
};

/**
 * Update teacher profile
 */
exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Handle profile photo upload if file is present
    if (req.file) {
      try {
        const uploadResult = await cloudinaryService.uploadImage(
          req.file.buffer,
          "teacher-profiles"
        );
        updateData.profilePhoto = uploadResult.secure_url;
        logger.info("Profile photo uploaded:", updateData.profilePhoto);
      } catch (uploadError) {
        logger.warn("Error uploading profile photo:", uploadError);
        // Continue without photo update
      }
    }

    await teacherService.updateTeacher(id, updateData);

    return successResponse(res, {
      message: "Profile updated successfully",
    });
  } catch (error) {
    logger.error("Error updating teacher profile:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to update profile", 500);
  }
};

/**
 * Get all teachers
 */
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await teacherService.getAllTeachers();
    return successResponse(res, teachers);
  } catch (error) {
    logger.error("Error fetching teachers:", error);
    return errorResponse(res, "Failed to fetch teachers", 500);
  }
};

// get all public teachers
exports.getAllPublicTeachers = async (req, res) => {
  try {
    const teachers = await teacherService.getAllPublicTeachers();
    return successResponse(res, teachers);
  } catch (error) {
    logger.error("Error fetching public teachers:", error);
    return errorResponse(res, "Failed to fetch public teachers", 500);
  }
};

/**
 * Get public teacher by ID
 */
exports.getPublicTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const teacher = await teacherService.getPublicTeacherById(
      id,
      user?.id || null
    );

    return res.json({
      success: true,
      teacher,
    });
  } catch (error) {
    logger.error("Error fetching teacher:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch teacher", 500);
  }
};

/**
 * Delete teacher account
 */
exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Ensure teacher can only delete their own account
    if (user.id !== id && user.role !== "admin") {
      return errorResponse(res, "Unauthorized: You can only delete your own account", 403);
    }

    await teacherService.deleteTeacher(id);

    return successResponse(res, {
      message: "Account deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting teacher account:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to delete account", 500);
  }
};