const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize("admin"));

// Get all teachers (with optional status filter)
router.get("/teachers", adminController.getAllTeachers);

// Get pending teachers only
router.get("/teachers/pending", adminController.getPendingTeachers);

// Update teacher status
router.put("/teachers/:id/status", adminController.updateTeacherStatus);

// Admin: paginated teacher posts
router.get("/teacher-posts", adminController.getAllTeacherPostsForAdmin);

// Admin: paginated students
router.get("/students", adminController.getAllStudentsForAdmin);

// Admin: paginated premium students
router.get("/students/premium", adminController.getAllPremiumStudentsForAdmin);

// Admin: paginated teacher subscriptions with subscription details
router.get("/teacher-subscriptions", adminController.getAllTeacherSubscriptionsForAdmin);

// Admin: paginated student posts
router.get("/student-posts", adminController.getAllStudentPostsForAdmin);

// Admin: get teacher post with full details
router.get("/teacher-posts/:id", adminController.getTeacherPostWithDetails);

// Admin: get student with premium status and post count
router.get("/students/:id", adminController.getStudentWithDetails);

// Admin: get student post with full details
router.get("/student-posts/:id", adminController.getStudentPostWithDetails);

// Admin: get dashboard metrics
router.get("/dashboard/metrics", adminController.getDashboardMetrics);

// Admin: get admin profile
router.get("/profile", adminController.getAdminProfile);

// Admin: update admin profile
router.put("/profile", adminController.updateAdminProfile);

module.exports = router;
