const { executeQuery, generateId } = require("./databaseService");
const logger = require("../utils/logger");
const axios = require("axios");

// OTP Configuration
const OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
const OTP_RESEND_COOLDOWN_SECONDS = 60; // Can resend OTP after 60 seconds
const MAX_OTP_ATTEMPTS = 5; // Maximum verification attempts

// WhatsApp API Configuration
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

/**
 * Generate a 6-digit OTP
 * @returns {String} - 6-digit OTP code
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via WhatsApp using Facebook WhatsApp Business API
 * @param {String} phoneNumber - Phone number with country code (e.g., +94771234567)
 * @param {String} otpCode - OTP code to send
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendWhatsAppOTP = async (phoneNumber, otpCode) => {
  try {
    // Check if WhatsApp API is configured
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      logger.warn(
        "WhatsApp API not configured. OTP will be logged instead of sent."
      );
      logger.info(
        `[WhatsApp OTP - DEV MODE] OTP for ${phoneNumber}: ${otpCode}`
      );
      return true;
    }
    console.log("otpCode", otpCode);

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");

    // Validate phone number format (must start with +)
    if (!cleanPhoneNumber.startsWith("+")) {
      throw new Error(
        "Phone number must include country code (e.g., +94771234567)"
      );
    }

    // WhatsApp Cloud API endpoint
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    // Send message via WhatsApp Business API
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhoneNumber,
        type: "template",
        template: {
          name: "phone_verification_otp_new",
          language: {
            code: "en",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: otpCode,
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: 0,
              parameters: [
                {
                  type: "text",
                  text: otpCode,
                },
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Log success
    logger.info(`[WhatsApp OTP] Successfully sent OTP to ${phoneNumber}`, {
      messageId: response.data.messages?.[0]?.id,
      status: response.data.messages?.[0]?.message_status,
    });

    return true;
  } catch (error) {
    console.log(error);
    // Log detailed error
    if (error.response) {
      // WhatsApp API returned an error
      logger.error("[WhatsApp OTP] API Error:", {
        status: error.response.status,
        error: error.response.data?.error,
        message: error.response.data?.error?.message,
        phoneNumber: phoneNumber,
      });

      // Handle specific error cases
      if (error.response.status === 401) {
        throw new Error(
          "WhatsApp API authentication failed. Please check access token."
        );
      } else if (error.response.status === 400) {
        const errorMessage = error.response.data?.error?.message || "";
        if (errorMessage.includes("phone number")) {
          throw new Error(
            "Invalid phone number format. Please include country code."
          );
        }
        throw new Error(`WhatsApp API error: ${errorMessage}`);
      }
    } else {
      logger.error("[WhatsApp OTP] Request Error:", error.message);
    }

    throw new Error("Failed to send OTP via WhatsApp. Please try again.");
  }
};

/**
 * Create or update OTP verification record
 * @param {String} userId - User ID (student or teacher)
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} phoneNumber - Phone number with country code
 * @returns {Promise<Object>} - OTP verification record
 */
const createOrUpdateOTP = async (userId, userType, phoneNumber) => {
  // Check if there's an existing unverified OTP for this user
  const existingQuery = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? AND isVerified = 0 AND expiresAt > NOW()
    ORDER BY created DESC
    LIMIT 1
  `;
  const existing = await executeQuery(existingQuery, [
    userId,
    userType,
    phoneNumber,
  ]);

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (existing.length > 0) {
    // Update existing OTP
    const updateQuery = `
      UPDATE OTPVerifications 
      SET otpCode = ?, expiresAt = ?, lastSentAt = NOW(), attempts = 0, updated = NOW()
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [otpCode, expiresAt, existing[0].id]);

    logger.info(`OTP updated for user ${userId} (${userType})`);
    return { ...existing[0], otpCode, expiresAt };
  } else {
    // Create new OTP
    const otpId = await generateId();
    const insertQuery = `
      INSERT INTO OTPVerifications 
      (id, userId, userType, phoneNumber, otpCode, expiresAt, lastSentAt, attempts, maxAttempts)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), 0, ?)
    `;
    await executeQuery(insertQuery, [
      otpId,
      userId,
      userType,
      phoneNumber,
      otpCode,
      expiresAt,
      MAX_OTP_ATTEMPTS,
    ]);

    logger.info(`OTP created for user ${userId} (${userType})`);
    return {
      id: otpId,
      userId,
      userType,
      phoneNumber,
      otpCode,
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_OTP_ATTEMPTS,
    };
  }
};

/**
 * Send OTP to user's phone number
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} phoneNumber - Phone number with country code
 * @returns {Promise<Object>} - OTP record with cooldown info
 */
const sendOTP = async (userId, userType, phoneNumber) => {
  // Check rate limiting - can't resend within cooldown period
  const recentQuery = `
    SELECT * FROM OTPVerifications
    WHERE userId = ? AND userType = ? AND phoneNumber = ?
    AND lastSentAt IS NOT NULL
    AND lastSentAt > DATE_SUB(NOW(), INTERVAL ? SECOND)
    ORDER BY lastSentAt DESC
    LIMIT 1
  `;
  const recent = await executeQuery(recentQuery, [
    userId,
    userType,
    phoneNumber,
    OTP_RESEND_COOLDOWN_SECONDS,
  ]);

  console.log("recent", recent);
  if (recent.length > 0) {
    const lastSent = new Date(recent[0].lastSentAt);
    const now = new Date();
    const secondsRemaining = Math.ceil(
      OTP_RESEND_COOLDOWN_SECONDS - (now - lastSent) / 1000
    );
    throw new Error(
      `Please wait ${secondsRemaining} seconds before requesting a new OTP`
    );
  }

  // Create or update OTP
  const otpRecord = await createOrUpdateOTP(userId, userType, phoneNumber);

  console.log("otpRecord", otpRecord);
  // Send OTP via WhatsApp
    await sendWhatsAppOTP(phoneNumber, otpRecord.otpCode);

  return {
    success: true,
    message: "OTP sent successfully",
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  };
};

/**
 * Verify OTP code
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} phoneNumber - Phone number with country code
 * @param {String} otpCode - OTP code to verify
 * @returns {Promise<Boolean>} - True if verified successfully
 */
const verifyOTP = async (userId, userType, phoneNumber, otpCode) => {
  // Find the most recent unverified OTP for this user
  const query = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? AND isVerified = 0
    ORDER BY created DESC
    LIMIT 1
  `;
  const records = await executeQuery(query, [userId, userType, phoneNumber]);

  if (records.length === 0) {
    throw new Error("No active OTP found. Please request a new OTP.");
  }

  const otpRecord = records[0];

  // Check if OTP has expired
  if (new Date(otpRecord.expiresAt) < new Date()) {
    throw new Error("OTP has expired. Please request a new OTP.");
  }

  // Check if max attempts exceeded
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw new Error(
      "Maximum verification attempts exceeded. Please request a new OTP."
    );
  }

  // Increment attempts
  await executeQuery(
    `UPDATE OTPVerifications SET attempts = attempts + 1, updated = NOW() WHERE id = ?`,
    [otpRecord.id]
  );

  // Verify OTP code
  if (otpRecord.otpCode !== otpCode) {
    throw new Error("Invalid OTP code. Please try again.");
  }

  // Mark as verified
  await executeQuery(
    `UPDATE OTPVerifications SET isVerified = 1, updated = NOW() WHERE id = ?`,
    [otpRecord.id]
  );

  logger.info(`OTP verified successfully for user ${userId} (${userType})`);
  return true;
};

/**
 * Check if user's phone number is verified
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} phoneNumber - Phone number with country code
 * @returns {Promise<Boolean>} - True if verified
 */
const isPhoneVerified = async (userId, userType, phoneNumber) => {
  const query = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? AND isVerified = 1
    ORDER BY updated DESC
    LIMIT 1
  `;
  const records = await executeQuery(query, [userId, userType, phoneNumber]);
  return records.length > 0;
};

/**
 * Get OTP status and cooldown info
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} phoneNumber - Phone number with country code
 * @returns {Promise<Object>} - OTP status info
 */
const getOTPStatus = async (userId, userType, phoneNumber) => {
  const query = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? AND isVerified = 0
    ORDER BY created DESC
    LIMIT 1
  `;
  const records = await executeQuery(query, [userId, userType, phoneNumber]);

  if (records.length === 0) {
    return {
      hasActiveOTP: false,
      canResend: true,
      cooldownSeconds: 0,
    };
  }

  const otpRecord = records[0];
  const now = new Date();
  const lastSent = otpRecord.lastSentAt ? new Date(otpRecord.lastSentAt) : null;
  const expiresAt = new Date(otpRecord.expiresAt);

  // Check if OTP is expired
  if (expiresAt < now) {
    return {
      hasActiveOTP: false,
      canResend: true,
      cooldownSeconds: 0,
    };
  }

  // Check cooldown
  let canResend = true;
  let cooldownSeconds = 0;
  if (lastSent) {
    const secondsSinceLastSent = Math.floor((now - lastSent) / 1000);
    if (secondsSinceLastSent < OTP_RESEND_COOLDOWN_SECONDS) {
      canResend = false;
      cooldownSeconds = Math.max(
        0,
        OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSent
      );
    }
  }

  return {
    hasActiveOTP: true,
    canResend,
    cooldownSeconds,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes: Math.ceil((expiresAt - now) / (1000 * 60)),
    attempts: otpRecord.attempts,
    maxAttempts: otpRecord.maxAttempts,
    lastSentAt: lastSent ? lastSent.toISOString() : null,
  };
};

/**
 * Create or update password reset OTP (email-based)
 * @param {String} userId - User ID (student or teacher)
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} email - User email
 * @returns {Promise<Object>} - OTP verification record
 */
const createOrUpdatePasswordResetOTP = async (userId, userType, email) => {
  // Check if there's an existing unverified OTP for this user
  const existingQuery = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? AND isVerified = 0 AND expiresAt > NOW()
    ORDER BY created DESC
    LIMIT 1
  `;
  // Use email as phoneNumber field for password reset (hack to reuse table)
  const existing = await executeQuery(existingQuery, [userId, userType, email]);

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (existing.length > 0) {
    // Update existing OTP
    const updateQuery = `
      UPDATE OTPVerifications 
      SET otpCode = ?, expiresAt = ?, lastSentAt = NOW(), attempts = 0, updated = NOW()
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [otpCode, expiresAt, existing[0].id]);

    logger.info(`Password reset OTP updated for user ${userId} (${userType})`);
    return { ...existing[0], otpCode, expiresAt };
  } else {
    // Create new OTP
    const otpId = await generateId();
    const insertQuery = `
      INSERT INTO OTPVerifications 
      (id, userId, userType, phoneNumber, otpCode, expiresAt, lastSentAt, attempts, maxAttempts)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), 0, ?)
    `;
    // Use email as phoneNumber field for password reset
    await executeQuery(insertQuery, [
      otpId,
      userId,
      userType,
      email,
      otpCode,
      expiresAt,
      MAX_OTP_ATTEMPTS,
    ]);

    logger.info(`Password reset OTP created for user ${userId} (${userType})`);
    return {
      id: otpId,
      userId,
      userType,
      email,
      otpCode,
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_OTP_ATTEMPTS,
    };
  }
};

/**
 * Send password reset OTP to user's email
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} email - User email
 * @returns {Promise<Object>} - OTP record with cooldown info
 */
const sendPasswordResetOTP = async (userId, userType, email) => {
  // Check rate limiting - can't resend within cooldown period
  const recentQuery = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? 
    AND lastSentAt IS NOT NULL 
    AND lastSentAt > DATE_SUB(NOW(), INTERVAL ? SECOND)
    ORDER BY lastSentAt DESC
    LIMIT 1
  `;
  // Use email as phoneNumber field
  const recent = await executeQuery(recentQuery, [
    userId,
    userType,
    email,
    OTP_RESEND_COOLDOWN_SECONDS,
  ]);

  if (recent.length > 0) {
    const lastSent = new Date(recent[0].lastSentAt);
    const now = new Date();
    const secondsRemaining = Math.ceil(
      OTP_RESEND_COOLDOWN_SECONDS - (now - lastSent) / 1000
    );
    throw new Error(
      `Please wait ${secondsRemaining} seconds before requesting a new OTP`
    );
  }

  // Create or update OTP
  const otpRecord = await createOrUpdatePasswordResetOTP(
    userId,
    userType,
    email
  );

  // Send OTP via email
  const emailService = require("./emailService");
  const userQuery =
    userType === "student"
      ? "SELECT name FROM Students WHERE id = ?"
      : "SELECT name FROM Teachers WHERE id = ?";
  const users = await executeQuery(userQuery, [userId]);
  const userName = users.length > 0 ? users[0].name : "User";

  await emailService.sendPasswordResetOTPEmail({
    email,
    name: userName,
    otpCode: otpRecord.otpCode,
  });

  console.log("otpRecord", otpRecord);

  return {
    success: true,
    message: "Password reset OTP sent successfully",
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  };
};

/**
 * Verify password reset OTP code
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} email - User email
 * @param {String} otpCode - OTP code to verify
 * @returns {Promise<Boolean>} - True if verified successfully
 */
const verifyPasswordResetOTP = async (userId, userType, email, otpCode) => {
  // Find the most recent unverified OTP for this user
  const query = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? AND isVerified = 0
    ORDER BY created DESC
    LIMIT 1
  `;
  // Use email as phoneNumber field
  const records = await executeQuery(query, [userId, userType, email]);

  if (records.length === 0) {
    throw new Error("No active OTP found. Please request a new OTP.");
  }

  const otpRecord = records[0];

  // Check if OTP has expired
  if (new Date(otpRecord.expiresAt) < new Date()) {
    throw new Error("OTP has expired. Please request a new OTP.");
  }

  // Check if max attempts exceeded
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw new Error(
      "Maximum verification attempts exceeded. Please request a new OTP."
    );
  }

  // Increment attempts
  await executeQuery(
    `UPDATE OTPVerifications SET attempts = attempts + 1, updated = NOW() WHERE id = ?`,
    [otpRecord.id]
  );

  // Verify OTP code
  if (otpRecord.otpCode !== otpCode) {
    throw new Error("Invalid OTP code. Please try again.");
  }

  // Mark as verified
  await executeQuery(
    `UPDATE OTPVerifications SET isVerified = 1, updated = NOW() WHERE id = ?`,
    [otpRecord.id]
  );

  logger.info(
    `Password reset OTP verified successfully for user ${userId} (${userType})`
  );
  return true;
};

/**
 * Get password reset OTP status
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} email - User email
 * @returns {Promise<Object>} - OTP status info
 */
const getPasswordResetOTPStatus = async (userId, userType, email) => {
  const query = `
    SELECT * FROM OTPVerifications 
    WHERE userId = ? AND userType = ? AND phoneNumber = ? AND isVerified = 0
    ORDER BY created DESC
    LIMIT 1
  `;
  // Use email as phoneNumber field
  const records = await executeQuery(query, [userId, userType, email]);

  if (records.length === 0) {
    return {
      hasActiveOTP: false,
      canResend: true,
      cooldownSeconds: 0,
    };
  }

  const otpRecord = records[0];
  const now = new Date();
  const lastSent = otpRecord.lastSentAt ? new Date(otpRecord.lastSentAt) : null;
  const expiresAt = new Date(otpRecord.expiresAt);

  // Check if OTP is expired
  if (expiresAt < now) {
    return {
      hasActiveOTP: false,
      canResend: true,
      cooldownSeconds: 0,
    };
  }

  // Check cooldown
  let canResend = true;
  let cooldownSeconds = 0;
  if (lastSent) {
    const secondsSinceLastSent = Math.floor((now - lastSent) / 1000);
    if (secondsSinceLastSent < OTP_RESEND_COOLDOWN_SECONDS) {
      canResend = false;
      cooldownSeconds = Math.max(
        0,
        OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSent
      );
    }
  }

  return {
    hasActiveOTP: true,
    canResend,
    cooldownSeconds,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes: Math.ceil((expiresAt - now) / (1000 * 60)),
    attempts: otpRecord.attempts,
    maxAttempts: otpRecord.maxAttempts,
    lastSentAt: lastSent ? lastSent.toISOString() : null,
  };
};

module.exports = {
  sendOTP,
  verifyOTP,
  isPhoneVerified,
  getOTPStatus,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  getPasswordResetOTPStatus,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  MAX_OTP_ATTEMPTS,
};
