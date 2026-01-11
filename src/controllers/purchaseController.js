const purchaseService = require("../services/purchaseService");
const stripeService = require("../services/stripeService");
const postService = require("../services/postService");
const connectionService = require("../services/connectionService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const {
  validateTeacherPurchase,
  validateContactPurchase,
} = require("../validators/purchaseValidator");
const logger = require("../utils/logger");
const teacherService = require("../services/teacherService");
const subscriptionService = require("../services/subscriptionService");
const premiumService = require("../services/premiumService");

/**
 * Get teacher purchases
 */
exports.getTeacherPurchases = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const purchases = await purchaseService.getTeacherPurchases(teacherId);

    return successResponse(res, purchases);
  } catch (error) {
    logger.error("Error fetching teacher purchases:", error);
    return errorResponse(res, "Failed to fetch teacher purchases", 500);
  }
};

/**
 * Create checkout session for teacher purchase
 */
exports.createTeacherPurchaseCheckout = async (req, res) => {
  try {
    const validation = validateTeacherPurchase(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const { studentPostId, teacherId, studentId } = req.body;
    const teacherEmail = req?.user?.email;

    // Check if purchase already exists
    const checkResult = await purchaseService.checkPurchaseStatus(
      teacherId,
      studentPostId
    );
    if (checkResult.hasPurchased) {
      return errorResponse(
        res,
        "Contact access already purchased for this post",
        400
      );
    }

    // Check if teacher has active subscription/premium
    let hasActiveSubscription = false;
    if (teacherEmail) {
      try {
        const subscriptionStatus =
          await subscriptionService.getSubscriptionStatus(teacherEmail);
        const premiumStatus = await premiumService.getTeacherPremiumStatus(
          teacherEmail
        );
        hasActiveSubscription =
          subscriptionStatus?.isActive || premiumStatus?.isPaid;
      } catch (error) {
        logger.warn("Error checking subscription status:", error);
      }
    }

    // If teacher has active subscription, auto-grant access without payment
    if (hasActiveSubscription) {
      // Create a free access purchase record
      await purchaseService.createFreeAccessPurchase({
        studentPostId,
        teacherId,
        studentId,
      });

      return successResponse(res, {
        message: "Contact information accessed via premium subscription",
        freeAccess: true,
        sessionId: null,
        url: null,
      });
    }

    // Get student post details
    const postDetails = await postService.getStudentPostById(studentPostId);

    const session = await stripeService.createTeacherPurchaseSession({
      studentPostId,
      teacherId,
      studentId,
      postDetails,
    });

    return successResponse(res, {
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error("Error creating checkout session:", error);
    return errorResponse(res, "Failed to create checkout session", 500);
  }
};

/**
 * Check if teacher has purchased access
 */
exports.checkPurchaseStatus = async (req, res) => {
  try {
    const { teacherId, studentPostId } = req.params;
    const result = await purchaseService.checkPurchaseStatus(
      teacherId,
      studentPostId
    );

    return successResponse(res, result);
  } catch (error) {
    logger.error("Error checking purchase status:", error);
    return errorResponse(res, "Failed to check purchase status", 500);
  }
};

/**
 * Get teacher purchase details
 */
exports.getTeacherPurchaseDetails = async (req, res) => {
  try {
    const { studentPostId, teacherId } = req.params;
    const purchase = await purchaseService.getTeacherPurchaseDetails(
      studentPostId,
      teacherId
    );

    return successResponse(res, purchase);
  } catch (error) {
    logger.error("Error fetching teacher purchase:", error);
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    return errorResponse(res, "Failed to fetch teacher purchase", 500);
  }
};

/**
 * Get student contact information
 */
exports.getStudentContact = async (req, res) => {
  try {
    const { postId, teacherId } = req.params;
    const teacherEmail = req?.user?.email;

    // Check if teacher has active subscription/premium
    let hasActiveSubscription = false;
    if (teacherEmail) {
      try {
        const subscriptionStatus =
          await subscriptionService.getSubscriptionStatus(teacherEmail);
        const premiumStatus = await premiumService.getTeacherPremiumStatus(
          teacherEmail
        );
        hasActiveSubscription =
          subscriptionStatus?.isActive || premiumStatus?.isPaid;
      } catch (error) {
        logger.warn("Error checking subscription status:", error);
      }
    }

    // If teacher has premium, get contact directly from post
    if (hasActiveSubscription) {
      const contact = await purchaseService.getStudentContactForPremium(
        postId,
        teacherId
      );
      return successResponse(res, contact);
    }

    // Otherwise, check if purchase exists
    const contact = await purchaseService.getStudentContact(postId, teacherId);

    return successResponse(res, contact);
  } catch (error) {
    logger.error("Error fetching student contact:", error);
    if (
      error.message.includes("not purchased") ||
      error.message.includes("not found")
    ) {
      return errorResponse(res, error.message, 403);
    }
    return errorResponse(res, "Failed to fetch student contact", 500);
  }
};

/**
 * Create checkout session for contact purchase
 */
exports.createContactPurchaseCheckout = async (req, res) => {
  try {
    const userId = req?.user?.id;
    const teacherEmail = req?.user?.email;
    const teacher = await teacherService.getTeacherById(userId);

    if (!teacher) {
      return errorResponse(res, "Unauthorized", 401);
    }
    const validation = validateContactPurchase(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(", ") });
    }

    const { requestId } = req.body;

    // Check if teacher has active subscription
    let hasActiveSubscription = false;
    try {
      const subscriptionStatus =
        await subscriptionService.getSubscriptionStatus(teacherEmail);
      const premiumStatus = await premiumService.getTeacherPremiumStatus(
        teacherEmail
      );
      hasActiveSubscription =
        subscriptionStatus?.isActive || premiumStatus?.isPaid;
    } catch (error) {
      logger.warn("Error checking subscription status:", error);
    }

    // If teacher has active subscription, auto-reveal contact without payment
    if (hasActiveSubscription) {
      await connectionService.purchaseConnectionRequest(
        requestId,
        userId,
        null
      );
      return successResponse(res, {
        message: "Contact information revealed (Premium subscription)",
        freeAccess: true,
      });
    }

    // Otherwise, create Stripe checkout session
    const session = await stripeService.createContactPurchaseSession({
      requestId,
      teacherId: userId,
    });

    return successResponse(res, { id: session.id });
  } catch (error) {
    logger.error("Error creating contact purchase checkout session:", error);
    return errorResponse(res, "Failed to create checkout session", 500);
  }
};
