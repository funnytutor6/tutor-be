const subscriptionService = require("../services/subscriptionService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Get subscription status
 * GET /api/subscriptions/status/:teacherEmail
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Teacher email is required", 400);
    }

    const status = await subscriptionService.getSubscriptionStatus(user.email);

    return successResponse(res, status);
  } catch (error) {
    logger.error("Error fetching subscription status:", error);
    return errorResponse(res, "Failed to fetch subscription status", 500);
  }
};

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { teacherEmail, cancelAtPeriodEnd = false } = req.body;

    if (!teacherEmail) {
      return errorResponse(res, "Teacher email is required", 400);
    }

    const canceledSubscription = await subscriptionService.cancelSubscription(
      teacherEmail,
      cancelAtPeriodEnd
    );

    return successResponse(res, {
      message: cancelAtPeriodEnd
        ? "Subscription will be canceled at the end of the billing period"
        : "Subscription canceled immediately",
      subscription: canceledSubscription,
    });
  } catch (error) {
    logger.error("Error canceling subscription:", error);
    if (error.message.includes("No active subscription")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to cancel subscription", 500);
  }
};

/**
 * Reactivate subscription
 * POST /api/subscriptions/reactivate
 */
exports.reactivateSubscription = async (req, res) => {
  try {
    const { teacherEmail } = req.body;

    if (!teacherEmail) {
      return errorResponse(res, "Teacher email is required", 400);
    }

    const reactivatedSubscription =
      await subscriptionService.reactivateSubscription(teacherEmail);

    return successResponse(res, {
      message: "Subscription reactivated successfully",
      subscription: reactivatedSubscription,
    });
  } catch (error) {
    logger.error("Error reactivating subscription:", error);
    if (error.message.includes("No subscription found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to reactivate subscription", 500);
  }
};

/**
 * Get invoice history
 * GET /api/subscriptions/invoice-history/:teacherEmail
 */
exports.getInvoiceHistory = async (req, res) => {
  try {
    const { teacherEmail } = req.params;

    if (!teacherEmail) {
      return errorResponse(res, "Teacher email is required", 400);
    }

    const invoices = await subscriptionService.getInvoiceHistory(teacherEmail);

    return successResponse(res, invoices);
  } catch (error) {
    logger.error("Error fetching invoice history:", error);
    return errorResponse(res, "Failed to fetch invoice history", 500);
  }
};

/**
 * Cancel student subscription
 * POST /api/subscriptions/student/cancel
 */
exports.cancelStudentSubscription = async (req, res) => {
  try {
    const { studentEmail, cancelAtPeriodEnd = false } = req.body;

    if (!studentEmail) {
      return errorResponse(res, "Student email is required", 400);
    }

    const canceledSubscription =
      await subscriptionService.cancelStudentSubscription(
        studentEmail,
        cancelAtPeriodEnd
      );

    return successResponse(res, {
      message: cancelAtPeriodEnd
        ? "Subscription will be canceled at the end of the billing period"
        : "Subscription canceled immediately",
      subscription: canceledSubscription,
    });
  } catch (error) {
    logger.error("Error canceling student subscription:", error);
    if (error.message.includes("No active subscription")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to cancel student subscription", 500);
  }
};

/**
 * Reactivate student subscription
 * POST /api/subscriptions/student/reactivate
 */
exports.reactivateStudentSubscription = async (req, res) => {
  try {
    const { studentEmail } = req.body;

    if (!studentEmail) {
      return errorResponse(res, "Student email is required", 400);
    }

    const reactivatedSubscription =
      await subscriptionService.reactivateStudentSubscription(studentEmail);

    return successResponse(res, {
      message: "Student subscription reactivated successfully",
      subscription: reactivatedSubscription,
    });
  } catch (error) {
    logger.error("Error reactivating student subscription:", error);
    if (error.message.includes("No subscription found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to reactivate student subscription", 500);
  }
};

/**
 * Get student invoice history
 * GET /api/subscriptions/student/invoice-history/:studentEmail
 */
exports.getStudentInvoiceHistory = async (req, res) => {
  try {
    const { studentEmail } = req.params;

    if (!studentEmail) {
      return errorResponse(res, "Student email is required", 400);
    }

    const invoices = await subscriptionService.getStudentInvoiceHistory(
      studentEmail
    );

    return successResponse(res, invoices);
  } catch (error) {
    logger.error("Error fetching student invoice history:", error);
    return errorResponse(res, "Failed to fetch student invoice history", 500);
  }
};
