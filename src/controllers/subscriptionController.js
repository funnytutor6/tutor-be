const subscriptionService = require("../services/subscriptionService");
const stripeService = require("../services/stripeService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const constants = require("../config/constants");
const logger = require("../utils/logger");

/**
 * Get subscription status
 * GET /api/subscriptions/status/:teacherEmail
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Tutor email is required", 400);
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
    const { cancelAtPeriodEnd = false } = req.body;
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Tutor email is required", 400);
    }

    const canceledSubscription = await subscriptionService.cancelSubscription(
      user.email,
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
    const user = req?.user;
    const teacherEmail = user?.email;

    if (!teacherEmail) {
      return errorResponse(res, "Tutor email is required", 400);
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
      return errorResponse(res, "Tutor email is required", 400);
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
    const user = req?.user;
    const { cancelAtPeriodEnd = false } = req.body;

    if (!user?.email) {
      return errorResponse(res, "Student email is required", 400);
    }

    const canceledSubscription =
      await subscriptionService.cancelStudentSubscription(
        user.email,
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
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Student email is required", 400);
    }

    const reactivatedSubscription =
      await subscriptionService.reactivateStudentSubscription(user.email);

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
 * GET /api/subscriptions/student/invoice-history
 */
exports.getStudentInvoiceHistory = async (req, res) => {
  try {
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Student email is required", 400);
    }

    const invoices = await subscriptionService.getStudentInvoiceHistory(
      user.email
    );

    return successResponse(res, invoices);
  } catch (error) {
    logger.error("Error fetching student invoice history:", error);
    return errorResponse(res, "Failed to fetch student invoice history", 500);
  }
};

/**
 * Get student subscription status
 * GET /api/subscriptions/student/status
 */
exports.getStudentSubscriptionStatus = async (req, res) => {
  try {
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Student email is required", 400);
    }

    const status = await subscriptionService.getStudentSubscriptionStatus(
      user.email
    );

    return successResponse(res, status);
  } catch (error) {
    logger.error("Error fetching student subscription status:", error);
    return errorResponse(res, "Failed to fetch subscription status", 500);
  }
};

/**
 * Create customer portal session for Tutor
 * POST /api/subscriptions/customer-portal
 */
exports.createCustomerPortalSession = async (req, res) => {
  try {
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Teacher email is required", 400);
    }

    // Get teacher subscription to find customer ID
    const subscriptionStatus =
      await subscriptionService.getSubscriptionStatus(user.email);

    if (
      !subscriptionStatus.hasSubscription ||
      !subscriptionStatus.subscription?.stripeCustomerId
    ) {
      return errorResponse(
        res,
        "No active subscription found for this Tutor",
        404
      );
    }

    const customerId = subscriptionStatus.subscription.stripeCustomerId;
    const returnUrl = `${constants.FRONTEND_URL}/dashboard/teacher?tab=premium`;

    const session = await stripeService.createCustomerPortalSession(
      customerId,
      returnUrl
    );

    return successResponse(res, { url: session.url });
  } catch (error) {
    logger.error("Error creating customer portal session:", error);
    return errorResponse(
      res,
      "Failed to create customer portal session",
      500
    );
  }
};

/**
 * Create customer portal session for student
 * POST /api/subscriptions/student/customer-portal
 */
exports.createStudentCustomerPortalSession = async (req, res) => {
  try {
    const user = req?.user;

    if (!user?.email) {
      return errorResponse(res, "Student email is required", 400);
    }

    // Get student subscription to find customer ID
    const subscriptionStatus =
      await subscriptionService.getStudentSubscriptionStatus(user.email);

    if (
      !subscriptionStatus.hasSubscription ||
      !subscriptionStatus.subscription?.stripeCustomerId
    ) {
      return errorResponse(
        res,
        "No active subscription found for this student",
        404
      );
    }

    const customerId = subscriptionStatus.subscription.stripeCustomerId;
    const returnUrl = `${constants.FRONTEND_URL}/dashboard/student?tab=subscriptions`;

    const session = await stripeService.createCustomerPortalSession(
      customerId,
      returnUrl
    );

    return successResponse(res, { url: session.url });
  } catch (error) {
    logger.error("Error creating customer portal session:", error);
    return errorResponse(
      res,
      "Failed to create customer portal session",
      500
    );
  }
};
