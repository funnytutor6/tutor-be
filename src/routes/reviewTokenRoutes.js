const express = require("express");
const router = express.Router();
const reviewTokenController = require("../controllers/reviewTokenController");
const { authenticate } = require("../middleware/authMiddleware");

// Authenticated routes (teacher only)
router.post(
  "/tokens/generate",
  authenticate,
  reviewTokenController.generateToken,
);
router.get(
  "/tokens/my-tokens",
  authenticate,
  reviewTokenController.getMyTokens,
);
router.delete(
  "/tokens/:tokenId",
  authenticate,
  reviewTokenController.deactivateToken,
);

// Public routes (no auth)
router.get("/public/:token", reviewTokenController.validatePublicToken);
router.post("/public/:token", reviewTokenController.submitPublicReview);

module.exports = router;
