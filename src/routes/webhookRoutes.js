const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

router.post("/webhook", webhookController.handleWebhook);
router.post("/manual-webhook-trigger", webhookController.manualWebhookTrigger);
router.get(
  "/api/check-payment/:sessionId",
  webhookController.checkPaymentStatus
);

module.exports = router;
