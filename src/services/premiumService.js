const { executeQuery, generateId } = require("./databaseService");
const { getCurrentMySQLDateTime } = require("../utils/dateFormatter");
const logger = require("../utils/logger");

/**
 * Get teacher premium status
 * @param {String} teacherEmail - Teacher email
 * @returns {Promise<Object>} - Premium status
 */
const getTeacherPremiumStatus = async (teacherEmail) => {
  const query = `
    SELECT * FROM findtutor_premium_teachers 
    WHERE mail = ?
  `;
  const records = await executeQuery(query, [teacherEmail]);

  if (records.length > 0) {
    const record = records[0];
    const now = new Date();

    // Check if subscription is active
    let isActive = false;
    let nextPaymentDate = null;
    let daysRemaining = null;

    if (record.stripeSubscriptionId && record.subscriptionStatus === "active") {
      // Check if current period hasn't ended
      if (record.currentPeriodEnd) {
        const periodEnd = new Date(record.currentPeriodEnd);
        isActive = periodEnd > now && !record.cancelAtPeriodEnd;
        if (isActive && !record.cancelAtPeriodEnd) {
          nextPaymentDate = periodEnd;
          daysRemaining = Math.ceil(
            (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } else {
        isActive = true;
      }
    } else if (record.ispaid && !record.stripeSubscriptionId) {
      // Legacy one-time payment - check if within 1 year
      if (record.paymentDate) {
        const paymentDate = new Date(record.paymentDate);
        const oneYearLater = new Date(
          paymentDate.getTime() + 365 * 24 * 60 * 60 * 1000
        );
        isActive = oneYearLater > now;
        if (isActive) {
          nextPaymentDate = oneYearLater;
          daysRemaining = Math.ceil(
            (oneYearLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } else {
        isActive = record.ispaid;
      }
    }

    const premiumStatus = {
      hasPremium: true,
      isPaid: isActive,
      premiumData: {
        id: record.id,
        mail: record.mail,
        link_or_video: record.link_or_video,
        link1: record.link1,
        link2: record.link2,
        link3: record.link3,
        video1: record.video1,
        video2: record.video2,
        video3: record.video3,
        ispaid: record.ispaid,
        paymentDate: record.paymentDate,
        paymentAmount: record.paymentAmount,
        stripeCustomerId: record.stripeCustomerId,
        stripeSubscriptionId: record.stripeSubscriptionId,
        subscriptionStatus: record.subscriptionStatus,
        currentPeriodStart: record.currentPeriodStart,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        canceledAt: record.canceledAt,
        created: record.created,
        updated: record.updated,
        stripeSessionId: record.stripeSessionId,
      },
      subscriptionStatus: record.subscriptionStatus,
      currentPeriodStart: record.currentPeriodStart,
      currentPeriodEnd: record.currentPeriodEnd,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      canceledAt: record.canceledAt,
      paymentDate: record.paymentDate,
      paymentAmount: record.paymentAmount,
      nextPaymentDate: nextPaymentDate,
      daysRemaining: daysRemaining,
      subscriptionPlan: {
        amount: record.paymentAmount || 29,
        currency: "USD",
        interval: "month", // All subscriptions are monthly
        name: "Premium Teacher Subscription",
      },
    };

    return premiumStatus;
  }

  return {
    hasPremium: false,
    isPaid: false,
    premiumData: null,
  };
};

/**
 * Create or update teacher premium record
 * @param {String} teacherEmail - Teacher email
 * @returns {Promise<Object>} - Premium record
 */
const createTeacherPremiumRecord = async (teacherEmail) => {
  const id = await generateId();
  const createQuery = `
    INSERT INTO findtutor_premium_teachers 
    (id, link_or_video, link1, link2, link3, ispaid, mail)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(createQuery, [
    id,
    true, // link_or_video
    "", // link1
    "", // link2
    "", // link3
    false, // ispaid
    teacherEmail,
  ]);

  const [newRecord] = await executeQuery(
    "SELECT * FROM findtutor_premium_teachers WHERE id = ?",
    [id]
  );

  return {
    hasPremium: true,
    isPaid: false,
    premiumData: newRecord,
  };
};

/**
 * Update teacher premium after payment (legacy one-time payment)
 * @param {Object} premiumData - Premium data from Stripe webhook
 * @returns {Promise<void>}
 */
const updateTeacherPremiumAfterPayment = async (premiumData) => {
  const { teacherEmail, stripeSessionId, paymentAmount } = premiumData;

  const checkQuery = "SELECT * FROM findtutor_premium_teachers WHERE mail = ?";
  const existing = await executeQuery(checkQuery, [teacherEmail]);

  const updateData = {
    ispaid: true,
    paymentDate: new Date().toISOString(),
    stripeSessionId: stripeSessionId,
    paymentAmount: paymentAmount,
  };

  if (existing.length > 0) {
    // Update existing record (only if not a subscription)
    if (!existing[0].stripeSubscriptionId) {
      const updateQuery = `
        UPDATE findtutor_premium_teachers 
        SET ispaid = ?, paymentDate = ?, stripeSessionId = ?, paymentAmount = ?, updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        updateData.ispaid,
        updateData.paymentDate,
        updateData.stripeSessionId,
        updateData.paymentAmount,
        existing[0].id,
      ]);

      logger.info(
        "Teacher premium status updated for existing teacher (one-time payment):",
        teacherEmail
      );
    }
  } else {
    // Create new premium record
    const id = await generateId();

    const createQuery = `
      INSERT INTO findtutor_premium_teachers 
      (id, mail, ispaid, link_or_video, link1, link2, link3, paymentDate, stripeSessionId, paymentAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(createQuery, [
      id,
      teacherEmail,
      updateData.ispaid,
      true, // Default to links
      "",
      "",
      "",
      updateData.paymentDate,
      updateData.stripeSessionId,
      updateData.paymentAmount,
    ]);

    logger.info(
      "Teacher premium record created for new teacher (one-time payment):",
      teacherEmail
    );
  }
};

/**
 * Update teacher subscription status
 * @param {Object} subscriptionData - Subscription data
 * @returns {Promise<void>}
 */
const updateTeacherSubscriptionStatus = async (subscriptionData) => {
  const subscriptionService = require("./subscriptionService");
  await subscriptionService.updateSubscriptionInDatabase(subscriptionData);
};

/**
 * Update teacher premium content
 * @param {String} teacherEmail - Teacher email
 * @param {Object} contentData - Content data
 * @returns {Promise<Object>} - Updated premium record
 */
const updateTeacherPremiumContent = async (teacherEmail, contentData) => {
  // Check if teacher has active premium (subscription or legacy payment)
  const premiumStatus = await getTeacherPremiumStatus(teacherEmail);

  // Also check subscription status for active subscriptions
  const subscriptionService = require("./subscriptionService");
  const subscriptionStatus = await subscriptionService.getSubscriptionStatus(teacherEmail);

  // Allow update if teacher has active premium (either legacy paid or active subscription)
  const hasActivePremium =
    (premiumStatus.hasPremium && premiumStatus.isPaid) ||
    subscriptionStatus.isActive;

  if (!hasActivePremium) {
    throw new Error("Active premium subscription required to update content");
  }

  const checkQuery = "SELECT * FROM findtutor_premium_teachers WHERE mail = ?";
  const existing = await executeQuery(checkQuery, [teacherEmail]);

  if (existing.length === 0) {
    throw new Error("Premium subscription required or not found");
  }

  const premiumRecord = existing[0];

  let updateQuery;
  let updateValues;

  if (contentData.link_or_video === true) {
    // YouTube links
    updateQuery = `
      UPDATE findtutor_premium_teachers 
      SET link_or_video = ?, link1 = ?, link2 = ?, link3 = ?, updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    updateValues = [
      true,
      contentData.link1 || "",
      contentData.link2 || "",
      contentData.link3 || "",
      premiumRecord.id,
    ];
  } else {
    // Video files
    updateQuery = `
      UPDATE findtutor_premium_teachers 
      SET link_or_video = ?, video1 = ?, video2 = ?, video3 = ?, updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    updateValues = [
      false,
      contentData.video1 || null,
      contentData.video2 || null,
      contentData.video3 || null,
      premiumRecord.id,
    ];
  }

  await executeQuery(updateQuery, updateValues);

  const [updatedRecord] = await executeQuery(
    "SELECT * FROM findtutor_premium_teachers WHERE id = ?",
    [premiumRecord.id]
  );

  return updatedRecord;
};

/**
 * Get student premium status
 * @param {String} studentEmail - Student email
 * @returns {Promise<Object>} - Premium status
 */
const getStudentPremiumStatus = async (studentEmail) => {
  const query = "SELECT * FROM findtitor_premium_student WHERE email = ?";
  const records = await executeQuery(query, [studentEmail]);

  if (records.length > 0) {
    const record = records[0];
    const now = new Date();

    // Check if subscription is active
    let isActive = false;
    let nextPaymentDate = null;
    let daysRemaining = null;

    console.log("record", record);

    if (record.stripeSubscriptionId && record.subscriptionStatus === "active") {
      // Check if current period hasn't ended
      if (record.currentPeriodEnd) {
        const periodEnd = new Date(record.currentPeriodEnd);
        isActive = periodEnd > now && !record.cancelAtPeriodEnd;
        if (isActive && !record.cancelAtPeriodEnd) {
          nextPaymentDate = periodEnd;
          daysRemaining = Math.ceil(
            (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } else {
        isActive = true;
      }
    } else if (record.ispayed && !record.stripeSubscriptionId) {
      // Legacy one-time payment - check if within 1 year
      if (record.paymentDate) {
        const paymentDate = new Date(record.paymentDate);
        const oneYearLater = new Date(
          paymentDate.getTime() + 365 * 24 * 60 * 60 * 1000
        );
        isActive = oneYearLater > now;
        if (isActive) {
          nextPaymentDate = oneYearLater;
          daysRemaining = Math.ceil(
            (oneYearLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } else {
        isActive = record.ispayed;
      }
    }

    const premiumStatus = {
      hasPremium: true,
      isPaid: isActive,
      premiumData: {
        id: record.id,
        email: record.email,
        subject: record.subject,
        mobile: record.mobile,
        topix: record.topix,
        descripton: record.descripton,
        ispayed: record.ispayed,
        paymentDate: record.paymentDate,
        paymentAmount: record.paymentAmount,
        stripeCustomerId: record.stripeCustomerId,
        stripeSubscriptionId: record.stripeSubscriptionId,
        subscriptionStatus: record.subscriptionStatus,
        currentPeriodStart: record.currentPeriodStart,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        canceledAt: record.canceledAt,
        created: record.created,
        updated: record.updated,
        stripeSessionId: record.stripeSessionId,
      },
      subscriptionStatus: record.subscriptionStatus,
      currentPeriodStart: record.currentPeriodStart,
      currentPeriodEnd: record.currentPeriodEnd,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      canceledAt: record.canceledAt,
      paymentDate: record.paymentDate,
      paymentAmount: record.paymentAmount,
      nextPaymentDate: nextPaymentDate,
      daysRemaining: daysRemaining,
      subscriptionPlan: {
        amount: record.paymentAmount || 15,
        currency: "USD",
        interval: "month", // All subscriptions are monthly
        name: "Premium Student Subscription",
      },
    };

    return premiumStatus;
  }

  return {
    hasPremium: false,
    isPaid: false,
    premiumData: null,
  };
};

/**
 * Update student premium after payment (legacy one-time payment)
 * @param {Object} premiumData - Premium data from Stripe webhook
 * @returns {Promise<void>}
 */
const updateStudentPremiumAfterPayment = async (premiumData) => {
  const {
    studentEmail,
    subject,
    mobile,
    topix,
    descripton,
    stripeSessionId,
    paymentAmount,
  } = premiumData;

  const checkQuery = "SELECT * FROM findtitor_premium_student WHERE email = ?";
  const existing = await executeQuery(checkQuery, [studentEmail]);

  const currentDateTime = getCurrentMySQLDateTime();

  const updateData = {
    email: studentEmail,
    subject: subject || "",
    mobile: mobile || "",
    topix: topix || "",
    descripton: descripton || "",
    ispayed: true,
    paymentDate: currentDateTime,
    stripeSessionId: stripeSessionId,
    paymentAmount: paymentAmount,
  };

  if (existing.length > 0) {
    // Update existing record (only if not a subscription)
    if (!existing[0].stripeSubscriptionId) {
      const updateQuery = `
        UPDATE findtitor_premium_student 
        SET subject = ?, mobile = ?, topix = ?, descripton = ?, ispayed = ?, 
            paymentDate = ?, stripeSessionId = ?, paymentAmount = ?, updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        updateData.subject,
        updateData.mobile,
        updateData.topix,
        updateData.descripton,
        updateData.ispayed,
        updateData.paymentDate,
        updateData.stripeSessionId,
        updateData.paymentAmount,
        existing[0].id,
      ]);

      logger.info(
        "Student premium status updated for existing student (one-time payment):",
        studentEmail
      );
    }
  } else {
    // Create new premium record
    const id = await generateId();

    const createQuery = `
      INSERT INTO findtitor_premium_student 
      (id, email, subject, mobile, topix, descripton, ispayed, paymentDate, stripeSessionId, paymentAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(createQuery, [
      id,
      updateData.email,
      updateData.subject,
      updateData.mobile,
      updateData.topix,
      updateData.descripton,
      updateData.ispayed,
      updateData.paymentDate,
      updateData.stripeSessionId,
      updateData.paymentAmount,
    ]);

    logger.info(
      "Student premium record created for new student (one-time payment):",
      studentEmail
    );
  }
};

/**
 * Get teacher post count
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Number>} - Post count
 */
const getTeacherPostCount = async (teacherId) => {
  const query = "SELECT COUNT(*) FROM TeacherPosts WHERE teacherId = ?";
  const result = await executeQuery(query, [teacherId]);
  return result[0]["COUNT(*)"];
};

module.exports = {
  getTeacherPremiumStatus,
  createTeacherPremiumRecord,
  updateTeacherPremiumAfterPayment,
  updateTeacherSubscriptionStatus,
  updateTeacherPremiumContent,
  getStudentPremiumStatus,
  updateStudentPremiumAfterPayment,
  getTeacherPostCount,
};
