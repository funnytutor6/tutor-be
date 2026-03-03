const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Create a review (student only)
router.post("/", authenticate, reviewController.createReview);

// Get reviews for a teacher (public)
router.get("/teacher/:teacherId", reviewController.getTeacherReviews);

// Get reviews written by student (authenticated)
router.get("/student", authenticate, reviewController.getStudentReviews);

// Teacher: request review removal
router.post("/removal-request", authenticate, authorize("teacher"), reviewController.requestReviewRemoval);

// Teacher: get my removal requests
router.get("/removal-requests", authenticate, authorize("teacher"), reviewController.getMyRemovalRequests);

module.exports = router;
