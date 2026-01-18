const express = require("express");
const router = express.Router();
const connectionController = require("../controllers/connectionController");
const { validate } = require("../middleware/validationMiddleware");
const {
  validateConnectionRequest,
} = require("../validators/purchaseValidator");
const { authenticate } = require("../middleware/authMiddleware");

router.post(
  "/connect/requests/send",
  validate(validateConnectionRequest),
  connectionController.sendConnectionRequest
);
router.get(
  "/connect/requests/teacher",
  authenticate,
  connectionController.getConnectionRequestsForTeacher
);
router.get(
  "/connect/requests/teacher/count",
  authenticate,
  connectionController.getConnectionRequestCount
);
router.get(
  "/connect/requests/student",
  authenticate,
  connectionController.getConnectionRequestsForStudent
);
router.get(
  "/connect/requests/:requestId",
  connectionController.getConnectionRequestById
);
router.post(
  "/connect/requests/:requestId/purchase",
  connectionController.purchaseConnectionRequest
);
router.get(
  "/posts/:postId/request-status/:studentId",
  connectionController.getRequestStatus
);

module.exports = router;
