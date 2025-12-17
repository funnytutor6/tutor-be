const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const teacherRoutes = require("./teacherRoutes");
const studentRoutes = require("./studentRoutes");
const postRoutes = require("./postRoutes");
const connectionRoutes = require("./connectionRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const premiumRoutes = require("./premiumRoutes");
const uploadRoutes = require("./uploadRoutes");
const webhookRoutes = require("./webhookRoutes");
const adminRoutes = require("./adminRoutes");
const otpRoutes = require("./otpRoutes");
const subscriptionRoutes = require("./subscriptionRoutes");

// Import existing premium route modules (for backward compatibility)
const studentPremiumRoutes = require("../../studentPremium");
const teacherPremiumRoutes = require("../../teacherPremium");
const subscriptionsRoutes = require("../../subscriptions");

// Mount routes
router.use("/api", connectionRoutes);
router.use("/api", authRoutes);
router.use("/api/students", studentRoutes);
router.use("/api/teachers", teacherRoutes);
router.use("/api/posts", postRoutes);
router.use("/api", purchaseRoutes);
router.use("/", premiumRoutes);
router.use("/api", uploadRoutes);
router.use("/", webhookRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api", otpRoutes);
router.use("/api/subscriptions", subscriptionRoutes);

// Mount existing premium routes (for backward compatibility)
router.use(
  "/api/collections/findtitor_premium_student/records",
  studentPremiumRoutes
);
router.use(
  "/api/collections/findtutor_premium_teachers/records",
  teacherPremiumRoutes
);
router.use(
  "/api/collections/findtutor_subcriptions/records",
  subscriptionsRoutes
);

module.exports = router;
