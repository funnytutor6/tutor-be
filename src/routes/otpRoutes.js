const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");

// OTP routes
router.post("/otp/send", otpController.sendOTP);
router.post("/otp/verify", otpController.verifyOTP);
router.get("/otp/status", otpController.getOTPStatus);
router.get("/otp/check-verified", otpController.checkPhoneVerified);

module.exports = router;
