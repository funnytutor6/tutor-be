const express = require("express");
const router = express.Router();
const premiumController = require("../controllers/premiumController");
const { authenticate } = require("../middleware/authMiddleware");

router.get(
  "/check-premium-status",
  authenticate,
  premiumController.checkTeacherPremiumStatus
);
router.post(
  "/create-premium-checkout-session",
  premiumController.createTeacherPremiumCheckout
);
router.post(
  "/update-premium-content",
  premiumController.updateTeacherPremiumContent
);
router.get(
  "/check-student-premium-status",
  authenticate,
  premiumController.checkStudentPremiumStatus
);
router.post(
  "/create-student-premium-checkout-session",
  premiumController.createStudentPremiumCheckout
);

module.exports = router;
