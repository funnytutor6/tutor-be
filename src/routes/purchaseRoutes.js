const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");
const { validate } = require("../middleware/validationMiddleware");
const {
  validateTeacherPurchase,
  validateContactPurchase,
} = require("../validators/purchaseValidator");
const { authenticate } = require("../middleware/authMiddleware");

router.get(
  "/buy/teacher-purchases/teacher/:teacherId",
  purchaseController.getTeacherPurchases
);
router.post(
  "/buy/teacher-purchases/create-checkout-session",
  authenticate,
  validate(validateTeacherPurchase),
  purchaseController.createTeacherPurchaseCheckout
);
router.get(
  "/buy/teacher-purchases/check/:teacherId/:studentPostId",
  purchaseController.checkPurchaseStatus
);
router.get(
  "/buy/teacher-purchases/:studentPostId/:teacherId",
  purchaseController.getTeacherPurchaseDetails
);
router.get(
  "/buy/posts/:postId/contact/:teacherId",
  authenticate,
  purchaseController.getStudentContact
);
router.post(
  "/create-checkout-session",
  authenticate,
  validate(validateContactPurchase),
  purchaseController.createContactPurchaseCheckout
);

module.exports = router;
