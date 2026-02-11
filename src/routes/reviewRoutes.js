const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { authenticate } = require("../middleware/authMiddleware");

// Create a review (student only)
router.post("/", authenticate, reviewController.createReview);

// Get reviews for a teacher (public)
router.get("/teacher/:teacherId", reviewController.getTeacherReviews);

// Get reviews written by student (authenticated)
router.get("/student", authenticate, reviewController.getStudentReviews);

module.exports = router;
