const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const PLATFORM_NAME = process.env.PLATFORM_NAME || "Funny Tutor";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

/**
 * Create email transporter
 * @returns {Object} - Nodemailer transporter
 */
const createTransporter = () => {
  // Check if email is configured
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    logger.warn(
      "Email service not configured. Emails will be logged instead of sent."
    );
    return null;
  }

  return nodemailer.createTransport(EMAIL_CONFIG);
};

/**
 * Load email template from file
 * @param {String} templateName - Name of the template file (without extension)
 * @returns {Promise<String>} - Template content
 */
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(
      __dirname,
      "../templates/emails",
      `${templateName}.html`
    );
    const template = await fs.readFile(templatePath, "utf-8");
    return template;
  } catch (error) {
    logger.error(`Error loading email template ${templateName}:`, error);
    throw new Error(`Email template ${templateName} not found`);
  }
};

/**
 * Replace placeholders in template
 * @param {String} template - Email template with {{placeholders}}
 * @param {Object} data - Data to replace placeholders
 * @returns {String} - Processed template
 */
const processTemplate = (template, data) => {
  let processed = template;

  // Replace all {{placeholder}} with actual values
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    processed = processed.replace(regex, data[key] || "");
  });

  return processed;
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.html - HTML content
 * @param {String} options.text - Plain text content (optional)
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  // If email not configured, log the email instead
  if (!transporter) {
    logger.info(`[EMAIL - DEV MODE] Would send email to ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Content: ${text || html.substring(0, 200)}...`);
    return true;
  }

  try {
    const mailOptions = {
      from: `"${PLATFORM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent successfully to ${to}:`, {
      messageId: info.messageId,
      subject,
    });

    return true;
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send welcome email to new student
 * @param {Object} studentData - Student data
 * @param {String} studentData.email - Student email
 * @param {String} studentData.name - Student name
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendWelcomeEmail = async ({ email, name }) => {
  try {
    // Load template
    const template = await loadTemplate("welcome-student");

    // Prepare template data
    const templateData = {
      platformName: PLATFORM_NAME,
      studentName: name,
      exploreCoursesLink: `${FRONTEND_URL}/find-teachers`,
      helpCenterLink: `${FRONTEND_URL}/help`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
      dashboardLink: `${FRONTEND_URL}/dashboard/student`,
    };

    // Process template
    const html = processTemplate(template, templateData);

    // Send email
    await sendEmail({
      to: email,
      subject: `Welcome to ${PLATFORM_NAME} – Let's Get Learning!`,
      html,
    });

    logger.info(`Welcome email sent to student: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending welcome email to ${email}:`, error);
    // Don't throw error - registration should succeed even if email fails
    return false;
  }
};

/**
 * Send OTP email (alternative to WhatsApp)
 * @param {Object} data - OTP data
 * @param {String} data.email - Recipient email
 * @param {String} data.name - Recipient name
 * @param {String} data.otpCode - OTP code
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendOTPEmail = async ({ email, name, otpCode }) => {
  try {
    const template = await loadTemplate("otp-verification");

    const templateData = {
      platformName: PLATFORM_NAME,
      userName: name,
      otpCode,
      expiryMinutes: 10,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: email,
      subject: `Your ${PLATFORM_NAME} Verification Code`,
      html,
    });

    logger.info(`OTP email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending OTP email to ${email}:`, error);
    return false;
  }
};

/**
 * Send welcome email to new teacher
 * @param {Object} teacherData - Teacher data
 * @param {String} teacherData.email - Teacher email
 * @param {String} teacherData.name - Teacher name
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherWelcomeEmail = async ({ email, name }) => {
  try {
    const template = await loadTemplate("teacher-welcome");

    const templateData = {
      platformName: PLATFORM_NAME,
      tutorName: name,
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      helpCenterLink: `${FRONTEND_URL}/help`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: email,
      subject: `Welcome to ${PLATFORM_NAME} – Start Teaching Today!`,
      html,
    });

    logger.info(`Teacher welcome email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending teacher welcome email to ${email}:`, error);
    return false;
  }
};

/**
 * Send notification to admin about new teacher registration
 * @param {Object} teacherData - Teacher data
 * @param {String} teacherData.name - Teacher name
 * @param {String} teacherData.email - Teacher email
 * @param {String} teacherData.phoneNumber - Teacher phone number
 * @param {String} teacherData.cityOrTown - Teacher city/town
 * @param {String} teacherData.country - Teacher country
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherRegistrationNotificationToAdmin = async ({
  name,
  email,
  phoneNumber,
  cityOrTown,
  country,
}) => {
  try {
    const template = await loadTemplate("teacher-registration-notification");

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: name,
      teacherEmail: email,
      teacherPhone: phoneNumber || "Not provided",
      teacherLocation: cityOrTown || "Not provided",
      teacherCountry: country || "Not provided",
      adminDashboardLink: `${FRONTEND_URL}/admin`,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    // Get all admin emails from database
    const { executeQuery } = require("./databaseService");
    const admins = await executeQuery("SELECT email FROM Admins");

    // Send to all admins or fallback to ADMIN_EMAIL env variable
    const adminEmails =
      admins.length > 0
        ? admins.map((admin) => admin.email)
        : ADMIN_EMAIL
        ? [ADMIN_EMAIL]
        : [];

    if (adminEmails.length === 0) {
      logger.warn("No admin emails found. Skipping admin notification.");
      return false;
    }

    // Send email to all admins
    const emailPromises = adminEmails.map((adminEmail) =>
      sendEmail({
        to: adminEmail,
        subject: `New Teacher Registration – ${PLATFORM_NAME}`,
        html,
      })
    );

    await Promise.all(emailPromises);

    logger.info(
      `Teacher registration notification sent to ${adminEmails.length} admin(s)`
    );
    return true;
  } catch (error) {
    logger.error(
      "Error sending teacher registration notification to admin:",
      error
    );
    return false;
  }
};

/**
 * Send teacher approval notification
 * @param {Object} teacherData - Teacher data
 * @param {String} teacherData.email - Teacher email
 * @param {String} teacherData.name - Teacher name
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherApprovalEmail = async ({ email, name }) => {
  try {
    const template = await loadTemplate("teacher-approved");

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: name,
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: email,
      subject: `Your Tutor Account Has Been Approved – ${PLATFORM_NAME}`,
      html,
    });

    logger.info(`Teacher approval email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending teacher approval email to ${email}:`, error);
    return false;
  }
};

/**
 * Send password reset OTP email
 * @param {Object} data - Password reset data
 * @param {String} data.email - Recipient email
 * @param {String} data.name - Recipient name
 * @param {String} data.otpCode - OTP code
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendPasswordResetOTPEmail = async ({ email, name, otpCode }) => {
  try {
    const template = await loadTemplate("password-reset-otp");

    const templateData = {
      platformName: PLATFORM_NAME,
      userName: name,
      otpCode,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: email,
      subject: `Reset Your Password – ${PLATFORM_NAME}`,
      html,
    });

    logger.info(`Password reset OTP email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending password reset OTP email to ${email}:`, error);
    return false;
  }
};

/**
 * Send teacher rejection notification
 * @param {Object} teacherData - Teacher data
 * @param {String} teacherData.email - Teacher email
 * @param {String} teacherData.name - Teacher name
 * @param {String} teacherData.rejectionReason - Optional rejection reason
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherRejectionEmail = async ({ email, name, rejectionReason }) => {
  try {
    const template = await loadTemplate("teacher-rejected");

    // Format rejection reason for template
    const formattedReason = rejectionReason
      ? `<p><strong>Reason:</strong> ${rejectionReason}</p>`
      : "<p>Please contact our support team for more information.</p>";

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: name,
      rejectionReason: formattedReason,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: email,
      subject: `Account Status Update – ${PLATFORM_NAME}`,
      html,
    });

    logger.info(`Teacher rejection email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending teacher rejection email to ${email}:`, error);
    return false;
  }
};

/**
 * Send password reset success confirmation email
 * @param {Object} data - User data
 * @param {String} data.email - Recipient email
 * @param {String} data.name - Recipient name
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendPasswordResetSuccessEmail = async ({ email, name }) => {
  try {
    const template = await loadTemplate("password-reset-success");

    const templateData = {
      platformName: PLATFORM_NAME,
      userName: name,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: email,
      subject: "Your Password Has Been Reset Successfully",
      html,
    });

    logger.info(`Password reset success email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(
      `Error sending password reset success email to ${email}:`,
      error
    );
    return false;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendTeacherWelcomeEmail,
  sendTeacherRegistrationNotificationToAdmin,
  sendOTPEmail,
  sendTeacherApprovalEmail,
  sendTeacherRejectionEmail,
  sendPasswordResetOTPEmail,
  sendPasswordResetSuccessEmail,
  loadTemplate,
  processTemplate,
};
