const studentService = require("../services/studentService");
const cloudinaryService = require("../services/cloudinaryService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Get student by ID
 */
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);

    return res.json({
      success: true,
      student,
    });
  } catch (error) {
    logger.error("Error fetching student:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch student", 500);
  }
};

/**
 * Update student profile
 */
exports.updateStudent = async (req, res) => {
  try {
    const { user } = req;
    const updateData = { ...req.body, id: user.id };

    // check if the student exists
    const student = await studentService.getStudentById(user.id);
    if (!student) {
      return errorResponse(res, "Student not found", 404);
    }

    await studentService.updateStudent(user.id, updateData);

    return successResponse(res, {
      message: "Profile updated successfully",
    });
  } catch (error) {
    logger.error("Error updating student profile:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to update profile", 500);
  }
};

/**
 * Get all students
 */
exports.getAllStudents = async (req, res) => {
  try {
    const students = await studentService.getAllStudents();
    return successResponse(res, students);
  } catch (error) {
    logger.error("Error fetching students:", error);
    return errorResponse(res, "Failed to fetch students", 500);
  }
};
