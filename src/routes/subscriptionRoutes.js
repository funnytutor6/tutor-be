const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { authenticate } = require("../middleware/authMiddleware");

// Get subscription status
router.get(
  "/status",
  authenticate,
  subscriptionController.getSubscriptionStatus
);

// Cancel subscription
router.post("/cancel", authenticate, subscriptionController.cancelSubscription);

// Reactivate subscription
router.post(
  "/reactivate",
  authenticate,
  subscriptionController.reactivateSubscription
);

// Get invoice history
router.get(
  "/invoice-history/:teacherEmail",
  authenticate,
  subscriptionController.getInvoiceHistory
);

// Student subscription management
router.post(
  "/student/cancel",
  authenticate,
  subscriptionController.cancelStudentSubscription
);
router.post(
  "/student/reactivate",
  authenticate,
  subscriptionController.reactivateStudentSubscription
);
router.get(
  "/student/invoice-history/:studentEmail",
  authenticate,
  subscriptionController.getStudentInvoiceHistory
);

module.exports = router;
