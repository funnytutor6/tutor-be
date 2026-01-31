const premiumService = require("../services/premiumService");
const subscriptionService = require("../services/subscriptionService");
const stripeService = require("../services/stripeService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Check teacher premium status
 */
exports.checkTeacherPremiumStatus = async (req, res) => {
  try {
    const user = req?.user;

    let status = await premiumService.getTeacherPremiumStatus(user.email);

    // Create record if not found
    if (!status.hasPremium) {
      status = await premiumService.createTeacherPremiumRecord(user.email);
    }

    return successResponse(res, status, status.hasPremium ? 200 : 201);
  } catch (error) {
    logger.error("Error checking/creating teacher premium status:", error);
    return errorResponse(res, "Failed to check or create premium status", 500);
  }
};

/**
 * Create teacher premium checkout session
 */
exports.createTeacherPremiumCheckout = async (req, res) => {
  try {
    const { teacherEmail, teacherName } = req.body;

    if (!teacherEmail) {
      return errorResponse(res, "Tutor email is required", 400);
    }

    // Create or retrieve Stripe customer
    const stripeCustomerId = await subscriptionService.createOrRetrieveCustomer(
      teacherEmail,
      teacherName
    );

    const session = await stripeService.createTeacherPremiumSession({
      teacherEmail,
      teacherName,
      stripeCustomerId,
    });

    return successResponse(res, { id: session.id });
  } catch (error) {
    logger.error("Error creating teacher premium checkout session:", error);
    return errorResponse(res, "Failed to create premium checkout session", 500);
  }
};

/**
 * Update teacher premium content
 */
exports.updateTeacherPremiumContent = async (req, res) => {
  try {
    const user = req?.user;
    const { contentData } = req.body;

    if (!user || !user.email) {
      return errorResponse(res, "Authentication required", 401);
    }

    if (!contentData) {
      return errorResponse(res, "Content data is required", 400);
    }

    // Use authenticated user's email for security
    const teacherEmail = user.email;

    const updated = await premiumService.updateTeacherPremiumContent(
      teacherEmail,
      contentData
    );

    return successResponse(res, {
      success: true,
      message: "Premium content updated successfully",
      data: updated,
    });
  } catch (error) {
    logger.error("Error updating premium content:", error);
    if (
      error.message.includes("required") ||
      error.message.includes("not found") ||
      error.message.includes("Premium subscription")
    ) {
      return errorResponse(res, error.message, 403);
    }
    return errorResponse(res, "Failed to update premium content", 500);
  }
};

/**
 * Check student premium status
 */
exports.checkStudentPremiumStatus = async (req, res) => {
  try {
    const user = req?.user;
    const status = await premiumService.getStudentPremiumStatus(user?.email);

    return successResponse(res, status);
  } catch (error) {
    logger.error("Error checking student premium status:", error);
    return errorResponse(res, "Failed to check student premium status", 500);
  }
};

/**
 * Create student premium checkout session
 */
exports.createStudentPremiumCheckout = async (req, res) => {
  try {
    const { studentData } = req.body;
    console.log(studentData);

    if (!studentData || !studentData.email) {
      return errorResponse(res, "Student data and email are required", 400);
    }

    // Create or retrieve Stripe customer
    const stripeCustomerId =
      await subscriptionService.createOrRetrieveStudentCustomer(
        studentData.email,
        studentData.name || studentData.email,
        studentData.descripton || "",
        studentData.subject || "",
        studentData.topix || ""
      );

    const session = await stripeService.createStudentPremiumSession({
      studentData,
      stripeCustomerId,
    });

    return successResponse(res, { id: session.id });
  } catch (error) {
    logger.error("Error creating student premium checkout session:", error);
    return errorResponse(
      res,
      "Failed to create student premium checkout session",
      500
    );
  }
};
