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

// Create customer portal session for teacher
router.post(
  "/customer-portal",
  authenticate,
  subscriptionController.createCustomerPortalSession
);

// Student subscription management
router.get(
  "/student/status",
  authenticate,
  subscriptionController.getStudentSubscriptionStatus
);
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
router.post(
  "/student/customer-portal",
  authenticate,
  subscriptionController.createStudentCustomerPortalSession
);
router.get(
  "/student/invoice-history",
  authenticate,
  subscriptionController.getStudentInvoiceHistory
);

module.exports = router;
