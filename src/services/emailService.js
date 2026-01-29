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
const PLATFORM_NAME = process.env.PLATFORM_NAME || "Funny Study Learning Academy";
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
 * Get all admin emails from database
 * @returns {Promise<Array<String>>} - Array of admin email addresses
 */
const getAllAdminEmails = async () => {
  try {
    const { executeQuery } = require("./databaseService");
    const admins = await executeQuery("SELECT email FROM Admins");

    // Get admin emails from database or fallback to ADMIN_EMAIL env variable
    const adminEmails =
      admins.length > 0
        ? admins.map((admin) => admin.email)
        : ADMIN_EMAIL
          ? [ADMIN_EMAIL]
          : [];

    return adminEmails;
  } catch (error) {
    logger.error("Error fetching admin emails:", error);
    // Fallback to ADMIN_EMAIL env variable
    return ADMIN_EMAIL ? [ADMIN_EMAIL] : [];
  }
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.html - HTML content
 * @param {String} options.text - Plain text content (optional)
 * @param {String|Array<String>} options.cc - CC recipients (optional)
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendEmail = async ({ to, subject, html, text, cc }) => {
  const transporter = createTransporter();

  // If email not configured, log the email instead
  if (!transporter) {
    logger.info(`[EMAIL - DEV MODE] Would send email to ${to}`);
    if (cc) {
      logger.info(`CC: ${Array.isArray(cc) ? cc.join(", ") : cc}`);
    }
    logger.info(`Subject: ${subject}`);
    logger.info(`Content: ${text || html.substring(0, 200)}...`);
    return true;
  }

  try {
    const mailOptions = {
      from: `Funny Study Learning Academy <info@funnystudylearning.com>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    };

    // Add CC if provided
    if (cc) {
      mailOptions.cc = cc;
    }

    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent successfully to ${to}:`, {
      messageId: info.messageId,
      subject,
      cc: cc || "none",
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
        subject: `New Tutor Registration – ${PLATFORM_NAME}`,
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

    logger.info(
      `Password reset OTP email sent to: ${email} otp code: ${otpCode}`
    );
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

/**
 * Send email change notification to user and CC admin
 * @param {Object} data - User data
 * @param {String} data.oldEmail - Old email address
 * @param {String} data.newEmail - New email address
 * @param {String} data.name - User name
 * @param {String} data.userType - User type ('teacher' or 'student')
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendEmailChangeNotification = async ({ oldEmail, newEmail, name, userType }) => {
  try {
    const template = await loadTemplate("email-change-notification");

    // Get all admin emails for CC
    const adminEmails = await getAllAdminEmails();

    const changeDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Prepare template data
    const templateData = {
      platformName: PLATFORM_NAME,
      userName: name,
      userType: userType === "teacher" ? "Tutor" : "Student",
      oldEmail: oldEmail,
      newEmail: newEmail,
      changeDate: changeDate,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    // Send email to old email address (with admin CC)
    const oldEmailPromise = sendEmail({
      to: oldEmail,
      subject: `Email Address Changed – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    }).catch((error) => {
      logger.error(`Error sending email change notification to old email ${oldEmail}:`, error);
      // Don't throw - continue to send to new email
    });

    // Send email to new email address (with admin CC)
    const newEmailPromise = sendEmail({
      to: newEmail,
      subject: `Email Address Changed – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    }).catch((error) => {
      logger.error(`Error sending email change notification to new email ${newEmail}:`, error);
      // Don't throw - at least we tried
    });

    // Wait for both emails to be sent (or fail gracefully)
    await Promise.all([oldEmailPromise, newEmailPromise]);

    logger.info(
      `Email change notification sent to old email: ${oldEmail} and new email: ${newEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending email change notification:`, error);
    return false;
  }
};

/**
 * Send connection request notification to teacher and CC admin
 * @param {Object} data - Connection request data
 * @param {String} data.teacherEmail - Teacher email address
 * @param {String} data.teacherName - Teacher name
 * @param {String} data.studentName - Student name
 * @param {String} data.studentEmail - Student email
 * @param {String} data.studentPhone - Student phone (optional)
 * @param {String} data.postHeadline - Post headline
 * @param {String} data.postSubject - Post subject
 * @param {String} data.message - Student message (optional)
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendConnectionRequestNotification = async ({
  teacherEmail,
  teacherName,
  studentName,
  postHeadline,
  postSubject
}) => {
  try {
    const template = await loadTemplate("connection-request-notification");

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: teacherName,
      studentName: studentName,
      postHeadline: postHeadline,
      postSubject: postSubject,
      requestDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    // Get all admin emails for CC
    const adminEmails = await getAllAdminEmails();

    // Send email to teacher with admin CC
    await sendEmail({
      to: teacherEmail,
      subject: `New Connection Request – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Connection request notification sent to teacher: ${teacherEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending connection request notification to ${teacherEmail}:`, error);
    return false;
  }
};

/**
 * Send student subscription payment success email with admin CC
 * @param {Object} data - Payment data
 * @param {String} data.studentEmail - Student email
 * @param {String} data.studentName - Student name
 * @param {String} data.invoiceNumber - Invoice number
 * @param {String} data.paymentAmount - Payment amount
 * @param {String} data.paymentDate - Payment date
 * @param {String} data.subscriptionPeriod - Subscription period
 * @param {String} data.nextBillingDate - Next billing date
 * @param {String} data.invoiceUrl - Invoice URL (optional)
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendStudentSubscriptionPaymentSuccess = async ({
  studentEmail,
  studentName,
  invoiceNumber,
  paymentAmount,
  paymentDate,
  subscriptionPeriod,
  nextBillingDate,
  invoiceUrl,
}) => {
  try {
    const template = await loadTemplate("student-subscription-payment-success");

    // Get all admin emails for CC
    const adminEmails = await getAllAdminEmails();

    const invoiceLinkSection = invoiceUrl
      ? `<div style="text-align: center; margin-top: 15px;">
          <a href="${invoiceUrl}" class="invoice-link" target="_blank">
            📄 View Invoice
          </a>
        </div>`
      : "";

    const templateData = {
      platformName: PLATFORM_NAME,
      studentName: studentName || "Student",
      invoiceNumber: invoiceNumber || "N/A",
      paymentAmount: paymentAmount || "$0.00",
      paymentDate: paymentDate || new Date().toLocaleDateString(),
      subscriptionPeriod: subscriptionPeriod || "Monthly",
      nextBillingDate: nextBillingDate || "N/A",
      invoiceLinkSection: invoiceLinkSection,
      dashboardLink: `${FRONTEND_URL}/dashboard/student`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    // Send email to student with admin CC
    await sendEmail({
      to: studentEmail,
      subject: `Payment Successful – Premium Package Activated – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Student subscription payment success email sent to: ${studentEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending student subscription payment success email to ${studentEmail}:`, error);
    return false;
  }
};

/**
 * Send teacher subscription payment success email with admin CC
 * @param {Object} data - Payment data
 * @param {String} data.teacherEmail - Teacher email
 * @param {String} data.teacherName - Teacher name
 * @param {String} data.invoiceNumber - Invoice number
 * @param {String} data.paymentAmount - Payment amount
 * @param {String} data.paymentDate - Payment date
 * @param {String} data.subscriptionPeriod - Subscription period
 * @param {String} data.nextBillingDate - Next billing date
 * @param {String} data.invoiceUrl - Invoice URL (optional)
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherSubscriptionPaymentSuccess = async ({
  teacherEmail,
  teacherName,
  invoiceNumber,
  paymentAmount,
  paymentDate,
  subscriptionPeriod,
  nextBillingDate,
  invoiceUrl,
}) => {
  try {
    const template = await loadTemplate("Tutor-subscription-payment-success");

    // Get all admin emails for CC
    const adminEmails = await getAllAdminEmails();

    const invoiceLinkSection = invoiceUrl
      ? `<div style="text-align: center; margin-top: 15px;">
          <a href="${invoiceUrl}" class="invoice-link" target="_blank">
            📄 View Invoice
          </a>
        </div>`
      : "";

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: teacherName || "Tutor",
      invoiceNumber: invoiceNumber || "N/A",
      paymentAmount: paymentAmount || "$0.00",
      paymentDate: paymentDate || new Date().toLocaleDateString(),
      subscriptionPeriod: subscriptionPeriod || "Monthly",
      nextBillingDate: nextBillingDate || "N/A",
      invoiceLinkSection: invoiceLinkSection,
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    // Send email to teacher with admin CC
    await sendEmail({
      to: teacherEmail,
      subject: `Payment Successful – Premium Package Activated – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Teacher subscription payment success email sent to: ${teacherEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending teacher subscription payment success email to ${teacherEmail}:`, error);
    return false;
  }
};

/**
 * Send teacher connection purchase success email with admin CC
 * @param {Object} data - Purchase data
 * @param {String} data.teacherEmail - Teacher email
 * @param {String} data.teacherName - Teacher name
 * @param {String} data.studentName - Student name
 * @param {String} data.postSubject - Post subject (optional)
 * @param {String} data.postHeadline - Post headline (optional)
 * @param {String} data.transactionId - Transaction ID
 * @param {String} data.paymentAmount - Payment amount
 * @param {String} data.paymentDate - Payment date
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherConnectionPurchaseSuccess = async ({
  teacherEmail,
  teacherName,
  studentName,
  postSubject,
  postHeadline,
  transactionId,
  paymentAmount,
  paymentDate,
}) => {
  try {
    const template = await loadTemplate("teacher-connection-purchase-success");

    // Get all admin emails for CC
    const adminEmails = await getAllAdminEmails();

    const postSubjectSection = postSubject
      ? `<p><strong>Subject:</strong> ${postSubject}</p>`
      : "";
    const postHeadlineSection = postHeadline
      ? `<p><strong>Post:</strong> ${postHeadline}</p>`
      : "";

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: teacherName || "Tutor",
      studentName: studentName || "Student",
      postSubjectSection: postSubjectSection,
      postHeadlineSection: postHeadlineSection,
      transactionId: transactionId || "N/A",
      paymentAmount: paymentAmount || "$0.00",
      paymentDate: paymentDate || new Date().toLocaleDateString(),
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    // Send email to teacher with admin CC
    await sendEmail({
      to: teacherEmail,
      subject: `Connection Purchase Successful – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Teacher connection purchase success email sent to: ${teacherEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending teacher connection purchase success email to ${teacherEmail}:`, error);
    return false;
  }
};



/**
 * Send student subscription canceled email with admin CC
 * @param {Object} data - Subscription data
 * @param {String} data.studentEmail - Student email
 * @param {String} data.studentName - Student name
 * @param {String} data.cancellationDate - Cancellation date
 * @param {String} data.periodEnd - Period end date
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendStudentSubscriptionCanceled = async ({
  studentEmail,
  studentName,
  cancellationDate,
  periodEnd,
}) => {
  try {
    const template = await loadTemplate("student-subscription-canceled");

    const adminEmails = await getAllAdminEmails();

    const templateData = {
      platformName: PLATFORM_NAME,
      studentName: studentName || "Student",
      cancellationDate: cancellationDate || new Date().toLocaleDateString(),
      periodEnd: periodEnd || "Unknown",
      dashboardLink: `${FRONTEND_URL}/dashboard/student`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: studentEmail,
      subject: `Subscription Canceled – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Student subscription canceled email sent to: ${studentEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending student subscription canceled email to ${studentEmail}:`, error);
    return false;
  }
};

/**
 * Send teacher subscription canceled email with admin CC
 * @param {Object} data - Subscription data
 * @param {String} data.teacherEmail - Teacher email
 * @param {String} data.teacherName - Teacher name
 * @param {String} data.cancellationDate - Cancellation date
 * @param {String} data.periodEnd - Period end date
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherSubscriptionCanceled = async ({
  teacherEmail,
  teacherName,
  cancellationDate,
  periodEnd,
}) => {
  try {
    const template = await loadTemplate("teacher-subscription-canceled");

    const adminEmails = await getAllAdminEmails();

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: teacherName || "Tutor",
      cancellationDate: cancellationDate || new Date().toLocaleDateString(),
      periodEnd: periodEnd || "Unknown",
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: teacherEmail,
      subject: `Subscription Canceled – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Teacher subscription canceled email sent to: ${teacherEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending teacher subscription canceled email to ${teacherEmail}:`, error);
    return false;
  }
};

/**
 * Send student payment failed email with admin CC
 * @param {Object} data - Payment data
 * @param {String} data.studentEmail - Student email
 * @param {String} data.studentName - Student name
 * @param {String} data.paymentAmount - Payment amount
 * @param {String} data.paymentDate - Payment date
 * @param {String} data.invoiceUrl - Invoice URL (optional)
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendStudentPaymentFailed = async ({
  studentEmail,
  studentName,
  paymentAmount,
  paymentDate,
  invoiceUrl,
}) => {
  try {
    const template = await loadTemplate("student-payment-failed");

    const adminEmails = await getAllAdminEmails();

    const invoiceLinkSection = invoiceUrl
      ? `<div style="text-align: center; margin-top: 15px;">
          <a href="${invoiceUrl}" class="button" style="background-color: #7f8c8d; font-size: 14px; padding: 10px 20px;" target="_blank">
            View Invoice
          </a>
        </div>`
      : "";

    const templateData = {
      platformName: PLATFORM_NAME,
      studentName: studentName || "Student",
      paymentAmount: paymentAmount || "$0.00",
      paymentDate: paymentDate || new Date().toLocaleDateString(),
      invoiceLinkSection: invoiceLinkSection,
      dashboardLink: `${FRONTEND_URL}/dashboard/student`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: studentEmail,
      subject: `Action Required: Payment Failed – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Student payment failed email sent to: ${studentEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending student payment failed email to ${studentEmail}:`, error);
    return false;
  }
};

/**
 * Send teacher payment failed email with admin CC
 * @param {Object} data - Payment data
 * @param {String} data.teacherEmail - Teacher email
 * @param {String} data.teacherName - Teacher name
 * @param {String} data.paymentAmount - Payment amount
 * @param {String} data.paymentDate - Payment date
 * @param {String} data.invoiceUrl - Invoice URL (optional)
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherPaymentFailed = async ({
  teacherEmail,
  teacherName,
  paymentAmount,
  paymentDate,
  invoiceUrl,
}) => {
  try {
    const template = await loadTemplate("teacher-payment-failed");

    const adminEmails = await getAllAdminEmails();

    const invoiceLinkSection = invoiceUrl
      ? `<div style="text-align: center; margin-top: 15px;">
          <a href="${invoiceUrl}" class="button" style="background-color: #7f8c8d; font-size: 14px; padding: 10px 20px;" target="_blank">
            View Invoice
          </a>
        </div>`
      : "";

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: teacherName || "Tutor",
      paymentAmount: paymentAmount || "$0.00",
      paymentDate: paymentDate || new Date().toLocaleDateString(),
      invoiceLinkSection: invoiceLinkSection,
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: teacherEmail,
      subject: `Action Required: Payment Failed – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Teacher payment failed email sent to: ${teacherEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending teacher payment failed email to ${teacherEmail}:`, error);
    return false;
  }
};

/**
 * Send student premium one-time purchase success email with admin CC
 * @param {Object} data - Purchase data
 * @param {String} data.studentEmail - Student email
 * @param {String} data.studentName - Student name
 * @param {String} data.paymentAmount - Payment amount
 * @param {String} data.paymentDate - Payment date
 * @param {String} data.transactionId - Transaction ID
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendStudentPremiumOneTimeSuccess = async ({
  studentEmail,
  studentName,
  paymentAmount,
  paymentDate,
  transactionId,
}) => {
  try {
    const template = await loadTemplate("student-premium-one-time-success");

    const adminEmails = await getAllAdminEmails();

    const templateData = {
      platformName: PLATFORM_NAME,
      studentName: studentName || "Student",
      paymentAmount: paymentAmount || "$0.00",
      paymentDate: paymentDate || new Date().toLocaleDateString(),
      transactionId: transactionId || "N/A",
      dashboardLink: `${FRONTEND_URL}/dashboard/student`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: studentEmail,
      subject: `Premium Activated Successfully – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Student one-time premium success email sent to: ${studentEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending student one-time premium success email to ${studentEmail}:`, error);
    return false;
  }
};

/**
 * Send teacher premium one-time purchase success email with admin CC
 * @param {Object} data - Purchase data
 * @param {String} data.teacherEmail - Teacher email
 * @param {String} data.teacherName - Teacher name
 * @param {String} data.paymentAmount - Payment amount
 * @param {String} data.paymentDate - Payment date
 * @param {String} data.transactionId - Transaction ID
 * @returns {Promise<Boolean>} - True if sent successfully
 */
const sendTeacherPremiumOneTimeSuccess = async ({
  teacherEmail,
  teacherName,
  paymentAmount,
  paymentDate,
  transactionId,
}) => {
  try {
    const template = await loadTemplate("teacher-premium-one-time-success");

    const adminEmails = await getAllAdminEmails();

    const templateData = {
      platformName: PLATFORM_NAME,
      teacherName: teacherName || "Tutor",
      paymentAmount: paymentAmount || "$0.00",
      paymentDate: paymentDate || new Date().toLocaleDateString(),
      transactionId: transactionId || "N/A",
      dashboardLink: `${FRONTEND_URL}/dashboard/teacher`,
      supportEmail: SUPPORT_EMAIL,
      currentYear: new Date().getFullYear(),
    };

    const html = processTemplate(template, templateData);

    await sendEmail({
      to: teacherEmail,
      subject: `Premium Activated Successfully – ${PLATFORM_NAME}`,
      html,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
    });

    logger.info(
      `Teacher one-time premium success email sent to: ${teacherEmail}${adminEmails.length > 0 ? ` (CC: ${adminEmails.join(", ")})` : ""}`
    );
    return true;
  } catch (error) {
    logger.error(`Error sending teacher one-time premium success email to ${teacherEmail}:`, error);
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
  sendEmailChangeNotification,
  sendConnectionRequestNotification,
  sendStudentSubscriptionPaymentSuccess,
  sendTeacherSubscriptionPaymentSuccess,
  sendTeacherConnectionPurchaseSuccess,
  sendStudentSubscriptionCanceled,
  sendTeacherSubscriptionCanceled,
  sendStudentPaymentFailed,
  sendTeacherPaymentFailed,
  sendStudentPremiumOneTimeSuccess,
  sendTeacherPremiumOneTimeSuccess,
  getAllAdminEmails,
  loadTemplate,
  processTemplate,
};
