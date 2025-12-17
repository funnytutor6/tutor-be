const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validate } = require("../middleware/validationMiddleware");
const {
  validateTeacherRegistration,
  validateStudentRegistration,
  validateLogin,
} = require("../validators/authValidator");

// Teacher authentication routes
router.post(
  "/teachers/register",
  validate(validateTeacherRegistration),
  authController.registerTeacher
);
router.post(
  "/teachers/complete-registration",
  authController.completeTeacherRegistration
);
router.post(
  "/teachers/login",
  validate(validateLogin),
  authController.loginTeacher
);

// Student authentication routes
router.post(
  "/students/register",
  validate(validateStudentRegistration),
  authController.registerStudent
);
router.post(
  "/students/complete-registration",
  authController.completeStudentRegistration
);
router.post(
  "/students/login",
  validate(validateLogin),
  authController.loginStudent
);

// Admin authentication routes
router.post("/admin/login", validate(validateLogin), authController.loginAdmin);

// Password reset routes
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);

module.exports = router;
