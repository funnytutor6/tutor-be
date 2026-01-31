const { executeQuery, generateId } = require("./databaseService");
const stripeService = require("./stripeService");
const logger = require("../utils/logger");

/**
 * Create or retrieve Stripe customer for teacher
 * @param {String} teacherEmail - Teacher email
 * @param {String} teacherName - Teacher name
 * @returns {Promise<String>} - Stripe customer ID
 */
const createOrRetrieveCustomer = async (teacherEmail, teacherName) => {
  // Check if customer already exists in database
  const checkQuery = `
    SELECT stripeCustomerId 
    FROM findtutor_premium_teachers 
    WHERE mail = ? AND stripeCustomerId IS NOT NULL
    LIMIT 1
  `;
  const existing = await executeQuery(checkQuery, [teacherEmail]);

  if (existing.length > 0 && existing[0].stripeCustomerId) {
    return existing[0].stripeCustomerId;
  }

  // Create customer in Stripe
  const customerId = await stripeService.createOrRetrieveCustomer(
    teacherEmail,
    teacherName
  );

  // Update database with customer ID
  const updateQuery = `
    UPDATE findtutor_premium_teachers 
    SET stripeCustomerId = ?, updated = CURRENT_TIMESTAMP
    WHERE mail = ?
  `;
  await executeQuery(updateQuery, [customerId, teacherEmail]);

  logger.info(`Created/retrieved Stripe customer for teacher: ${teacherEmail}`);
  return customerId;
};

/**
 * Get subscription status for teacher
 * @param {String} teacherEmail - Teacher email
 * @returns {Promise<Object>} - Subscription status
 */
const getSubscriptionStatus = async (teacherEmail) => {
  const query = `
    SELECT 
      id, mail, ispaid, stripeCustomerId, stripeSubscriptionId, 
      subscriptionStatus, currentPeriodStart, currentPeriodEnd, 
      cancelAtPeriodEnd, canceledAt, paymentDate
    FROM findtutor_premium_teachers 
    WHERE mail = ?
    LIMIT 1
  `;
  const records = await executeQuery(query, [teacherEmail]);

  if (records.length === 0) {
    return {
      hasSubscription: false,
      isActive: false,
      subscription: null,
    };
  }

  const record = records[0];
  const now = new Date();

  // Check if subscription is active
  let isActive = false;
  if (record.stripeSubscriptionId && record.subscriptionStatus === "active") {
    if (record.currentPeriodEnd) {
      const periodEnd = new Date(record.currentPeriodEnd);
      isActive = periodEnd > now;
    } else {
      isActive = true;
    }
  } else if (record.ispaid && !record.stripeSubscriptionId) {
    // Legacy one-time payment - check if within 30 days
    if (record.paymentDate) {
      const paymentDate = new Date(record.paymentDate);
      const thirtyDaysLater = new Date(
        paymentDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      isActive = thirtyDaysLater > now;
    } else {
      isActive = record.ispaid;
    }
  }

  return {
    hasSubscription: !!record.stripeSubscriptionId,
    isActive: isActive,
    subscription: {
      id: record.id,
      email: record.mail,
      stripeCustomerId: record.stripeCustomerId,
      stripeSubscriptionId: record.stripeSubscriptionId,
      status: record.subscriptionStatus,
      currentPeriodStart: record.currentPeriodStart,
      currentPeriodEnd: record.currentPeriodEnd,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      canceledAt: record.canceledAt,
      isPaid: record.ispaid,
      paymentDate: record.paymentDate,
    },
  };
};

/**
 * Update subscription in database
 * @param {Object} subscriptionData - Subscription data from Stripe
 * @returns {Promise<Object>}
 */
const updateSubscriptionInDatabase = async (subscriptionData) => {
  const {
    teacherEmail,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt,
    // Payment fields (optional)
    paymentDate,
    stripeSessionId,
    paymentAmount,
  } = subscriptionData;

  // First, check if a record already exists with this stripeSubscriptionId (idempotency)
  let existing = [];
  let lookupField = "mail"; // Default lookup by email
  let lookupValue = teacherEmail;

  if (stripeSubscriptionId) {
    const checkBySubscriptionQuery = `
      SELECT id, mail FROM findtutor_premium_teachers WHERE stripeSubscriptionId = ? LIMIT 1`;
    const existingBySubscription = await executeQuery(checkBySubscriptionQuery, [stripeSubscriptionId]);
    
    if (existingBySubscription.length > 0) {
      // Found by subscription ID - use this record (prevents duplicates)
      existing = existingBySubscription;
      lookupField = "id";
      lookupValue = existingBySubscription[0].id;
      logger.info(`Found existing teacher subscription record by stripeSubscriptionId: ${stripeSubscriptionId}`);
    }
  }

  // If not found by subscription ID, check by email
  if (existing.length === 0) {
    const checkByEmailQuery = `
      SELECT id FROM findtutor_premium_teachers WHERE mail = ?`;
    existing = await executeQuery(checkByEmailQuery, [teacherEmail]);
  }

  if (existing.length > 0) {
    // Build dynamic UPDATE query - only update fields that are not null
    const updateFields = [];
    const updateValues = [];

    // Always update these fields if provided
    if (stripeCustomerId !== undefined && stripeCustomerId !== null) {
      updateFields.push("stripeCustomerId = ?");
      updateValues.push(stripeCustomerId);
    }
    if (stripeSubscriptionId !== undefined && stripeSubscriptionId !== null) {
      updateFields.push("stripeSubscriptionId = ?");
      updateValues.push(stripeSubscriptionId);
    }
    if (subscriptionStatus !== undefined && subscriptionStatus !== null) {
      updateFields.push("subscriptionStatus = ?");
      updateValues.push(subscriptionStatus);
    }

    // Only update date fields if they are not null
    if (currentPeriodStart !== undefined && currentPeriodStart !== null) {
      updateFields.push("currentPeriodStart = ?");
      updateValues.push(currentPeriodStart);
    }
    if (currentPeriodEnd !== undefined && currentPeriodEnd !== null) {
      updateFields.push("currentPeriodEnd = ?");
      updateValues.push(currentPeriodEnd);
    }
    if (canceledAt !== undefined && canceledAt !== null) {
      updateFields.push("canceledAt = ?");
      updateValues.push(canceledAt);
    }

    // Always update cancelAtPeriodEnd (boolean, can be false)
    if (cancelAtPeriodEnd !== undefined) {
      updateFields.push("cancelAtPeriodEnd = ?");
      updateValues.push(cancelAtPeriodEnd || false);
    }

    // Payment fields (optional)
    if (paymentDate !== undefined && paymentDate !== null) {
      updateFields.push("paymentDate = ?");
      updateValues.push(paymentDate);
    }
    if (stripeSessionId !== undefined && stripeSessionId !== null) {
      updateFields.push("stripeSessionId = ?");
      updateValues.push(stripeSessionId);
    }
    if (paymentAmount !== undefined && paymentAmount !== null) {
      updateFields.push("paymentAmount = ?");
      updateValues.push(paymentAmount);
    }

    // Set ispaid based on subscription status
    const isPaid =
      subscriptionStatus === "active" || subscriptionStatus === "trialing";
    updateFields.push("ispaid = ?");
    updateValues.push(isPaid);

    // Always update the updated timestamp
    updateFields.push("updated = CURRENT_TIMESTAMP");

    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE findtutor_premium_teachers 
        SET ${updateFields.join(", ")}
        WHERE ${lookupField} = ?`;

      updateValues.push(lookupValue);

      await executeQuery(updateQuery, updateValues);

      logger.info(
        `Updated subscription in database for teacher: ${teacherEmail} (lookup by ${lookupField})`
      );
    }

    return {
      currentPeriodStart,
      currentPeriodEnd,
      paymentDate: paymentDate || new Date(),
    };
  } else {
    // Create new record
    const id = await generateId();
    const actualPaymentDate = paymentDate || new Date();
    const insertQuery = `
      INSERT INTO findtutor_premium_teachers 
      (id, mail, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, 
       currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, canceledAt, ispaid,
       paymentDate, stripeSessionId, paymentAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const isPaid =
      subscriptionStatus === "active" || subscriptionStatus === "trialing";

    await executeQuery(insertQuery, [
      id,
      teacherEmail,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd || false,
      canceledAt,
      isPaid,
      actualPaymentDate,
      stripeSessionId || null,
      paymentAmount || null,
    ]);

    logger.info(
      `Created subscription record in database for teacher: ${teacherEmail}`
    );

    return {
      currentPeriodStart,
      currentPeriodEnd,
      paymentDate: actualPaymentDate,
    };
  }
};

/**
 * Cancel subscription
 * @param {String} teacherEmail - Teacher email
 * @param {Boolean} cancelAtPeriodEnd - Whether to cancel at period end
 * @returns {Promise<Object>} - Canceled subscription
 */
const cancelSubscription = async (teacherEmail, cancelAtPeriodEnd = false) => {
  // Get subscription ID from database
  const query = `
    SELECT stripeSubscriptionId 
    FROM findtutor_premium_teachers 
    WHERE mail = ? AND stripeSubscriptionId IS NOT NULL
    LIMIT 1
  `;
  const records = await executeQuery(query, [teacherEmail]);

  if (records.length === 0 || !records[0].stripeSubscriptionId) {
    throw new Error("No active subscription found for this teacher");
  }

  const subscriptionId = records[0].stripeSubscriptionId;

  // Cancel in Stripe
  const canceledSubscription = await stripeService.cancelSubscription(
    subscriptionId,
    cancelAtPeriodEnd
  );

  // Update database
  await updateSubscriptionInDatabase({
    teacherEmail,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: cancelAtPeriodEnd
      ? canceledSubscription.status
      : "canceled",
    currentPeriodStart: canceledSubscription.current_period_start
      ? new Date(canceledSubscription.current_period_start * 1000)
      : null,
    currentPeriodEnd: canceledSubscription.current_period_end
      ? new Date(canceledSubscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: cancelAtPeriodEnd,
    canceledAt: cancelAtPeriodEnd ? null : new Date(),
    stripeCustomerId: canceledSubscription.customer,
  });

  logger.info(
    `Canceled subscription for teacher: ${teacherEmail}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`
  );

  return canceledSubscription;
};

/**
 * Reactivate subscription
 * @param {String} teacherEmail - Teacher email
 * @returns {Promise<Object>} - Reactivated subscription
 */
const reactivateSubscription = async (teacherEmail) => {
  // Get subscription ID from database
  const query = `
    SELECT stripeSubscriptionId 
    FROM findtutor_premium_teachers 
    WHERE mail = ? AND stripeSubscriptionId IS NOT NULL
    LIMIT 1
  `;
  const records = await executeQuery(query, [teacherEmail]);

  if (records.length === 0 || !records[0].stripeSubscriptionId) {
    throw new Error("No subscription found for this Tutor");
  }

  const subscriptionId = records[0].stripeSubscriptionId;

  // Reactivate in Stripe
  const reactivatedSubscription = await stripeService.reactivateSubscription(
    subscriptionId
  );

  // Update database
  await updateSubscriptionInDatabase({
    teacherEmail,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: reactivatedSubscription.status,
    currentPeriodStart: reactivatedSubscription.current_period_start
      ? new Date(reactivatedSubscription.current_period_start * 1000)
      : null,
    currentPeriodEnd: reactivatedSubscription.current_period_end
      ? new Date(reactivatedSubscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeCustomerId: reactivatedSubscription.customer,
  });

  logger.info(`Reactivated subscription for teacher: ${teacherEmail}`);

  return reactivatedSubscription;
};

/**
 * Get invoice history for teacher
 * @param {String} teacherEmail - Teacher email
 * @returns {Promise<Array>} - Invoice history
 */
const getInvoiceHistory = async (teacherEmail) => {
  // Get customer ID from database
  const query = `
    SELECT stripeCustomerId,  
    currentPeriodStart,
    currentPeriodEnd
    FROM findtutor_premium_teachers 
    WHERE mail = ? AND stripeCustomerId IS NOT NULL
    LIMIT 1
  `;
  const records = await executeQuery(query, [teacherEmail]);

  if (records.length === 0 || !records[0].stripeCustomerId) {
    return [];
  }

  const customerId = records[0].stripeCustomerId;
  const customer = records[0];

  // Get invoices from Stripe
  const invoices = await stripeService.getCustomerInvoices(customerId);

   console.log("invoices.data", invoices.data);
   console.log("customer", customer);
  return invoices.data.map((invoice) => ({
    id: invoice.id,
    amount: invoice.amount_paid / 100, // Convert from pence to pounds
    currency: invoice.currency.toUpperCase(),
    status: invoice.status,
    created: new Date(invoice.created * 1000),
    periodStart: new Date(customer.currentPeriodStart ),
    periodEnd: new Date(customer.currentPeriodEnd ),
    invoicePdf: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  }));
};

/**
 * Create or retrieve Stripe customer for student
 * @param {String} studentEmail - Student email
 * @param {String} studentName - Student name
 * @returns {Promise<String>} - Stripe customer ID
 */
const createOrRetrieveStudentCustomer = async (studentEmail, studentName, descripton, subject, topix) => {
  // Check if customer already exists in database
  const checkQuery = `
    SELECT stripeCustomerId 
    FROM findtitor_premium_student 
    WHERE email = ? AND stripeCustomerId IS NOT NULL
    LIMIT 1
  `;
  const existing = await executeQuery(checkQuery, [studentEmail]);

  if (existing.length > 0 && existing[0].stripeCustomerId) {
    return existing[0].stripeCustomerId;
  }

  // Create customer in Stripe
  const customerId = await stripeService.createOrRetrieveCustomer(
    studentEmail,
    studentName
  );

  // Update database with customer ID
  const updateQuery = `
    UPDATE findtitor_premium_student 
    SET stripeCustomerId = ?, updated = CURRENT_TIMESTAMP
    WHERE email = ?
  `;
  await executeQuery(updateQuery, [customerId, studentEmail]);

  logger.info(`Created/retrieved Stripe customer for student: ${studentEmail}`);
  return customerId;
};

/**
 * Get subscription status for student
 * @param {String} studentEmail - Student email
 * @returns {Promise<Object>} - Subscription status
 */
const getStudentSubscriptionStatus = async (studentEmail) => {
  const query = `
    SELECT 
      id, email, ispayed, stripeCustomerId, stripeSubscriptionId, 
      subscriptionStatus, currentPeriodStart, currentPeriodEnd, 
      cancelAtPeriodEnd, canceledAt, paymentDate
    FROM findtitor_premium_student 
    WHERE email = ?
    LIMIT 1
  `;
  const records = await executeQuery(query, [studentEmail]);

  if (records.length === 0) {
    return {
      hasSubscription: false,
      isActive: false,
      subscription: null,
    };
  }

  const record = records[0];
  const now = new Date();

  // Check if subscription is active
  let isActive = false;
  if (record.stripeSubscriptionId && record.subscriptionStatus === "active") {
    if (record.currentPeriodEnd) {
      const periodEnd = new Date(record.currentPeriodEnd);
      isActive = periodEnd > now;
    } else {
      isActive = true;
    }
  } else if (record.ispayed && !record.stripeSubscriptionId) {
    // Legacy one-time payment - check if within 30 days
    if (record.paymentDate) {
      const paymentDate = new Date(record.paymentDate);
      const thirtyDaysLater = new Date(
        paymentDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      isActive = thirtyDaysLater > now;
    } else {
      isActive = record.ispayed;
    }
  }

  return {
    hasSubscription: !!record.stripeSubscriptionId,
    isActive: isActive,
    subscription: {
      id: record.id,
      email: record.email,
      stripeCustomerId: record.stripeCustomerId,
      stripeSubscriptionId: record.stripeSubscriptionId,
      status: record.subscriptionStatus,
      currentPeriodStart: record.currentPeriodStart,
      currentPeriodEnd: record.currentPeriodEnd,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      canceledAt: record.canceledAt,
      isPaid: record.ispayed,
      paymentDate: record.paymentDate,
    },
  };
};

/**
 * Update student subscription in database
 * @param {Object} subscriptionData - Subscription data from Stripe
 * @returns {Promise<Object>}
 */
const updateStudentSubscriptionInDatabase = async (subscriptionData) => {
  const {
    studentEmail,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt,
    // Form fields (optional - from checkout metadata)
    subject,
    mobile,
    topix,
    descripton,
    // Payment fields (optional)
    paymentDate,
    stripeSessionId,
    paymentAmount,
  } = subscriptionData;

  logger.debug("updateStudentSubscriptionInDatabase called with:", { studentEmail, stripeSubscriptionId, subscriptionStatus, subject, mobile });

  // First, check if a record already exists with this stripeSubscriptionId (idempotency)
  let existing = [];
  let lookupField = "email"; // Default lookup by email
  let lookupValue = studentEmail;

  if (stripeSubscriptionId) {
    const checkBySubscriptionQuery = `
      SELECT id, email FROM findtitor_premium_student WHERE stripeSubscriptionId = ? LIMIT 1`;
    const existingBySubscription = await executeQuery(checkBySubscriptionQuery, [stripeSubscriptionId]);
    
    if (existingBySubscription.length > 0) {
      // Found by subscription ID - use this record (prevents duplicates)
      existing = existingBySubscription;
      lookupField = "id";
      lookupValue = existingBySubscription[0].id;
      logger.info(`Found existing student subscription record by stripeSubscriptionId: ${stripeSubscriptionId}`);
    }
  }

  // If not found by subscription ID, check by email
  if (existing.length === 0) {
    const checkByEmailQuery = `
      SELECT id FROM findtitor_premium_student WHERE email = ?
    `;
    existing = await executeQuery(checkByEmailQuery, [studentEmail]);
  }

  if (existing.length > 0) {
    // Build dynamic UPDATE query - only update fields that are not null
    const updateFields = [];
    const updateValues = [];

    // Always update these fields if provided
    if (stripeCustomerId !== undefined && stripeCustomerId !== null) {
      updateFields.push("stripeCustomerId = ?");
      updateValues.push(stripeCustomerId);
    }
    if (stripeSubscriptionId !== undefined && stripeSubscriptionId !== null) {
      updateFields.push("stripeSubscriptionId = ?");
      updateValues.push(stripeSubscriptionId);
    }
    if (subscriptionStatus !== undefined && subscriptionStatus !== null) {
      updateFields.push("subscriptionStatus = ?");
      updateValues.push(subscriptionStatus);
    }

    // Only update date fields if they are not null
    if (currentPeriodStart !== undefined && currentPeriodStart !== null) {
      updateFields.push("currentPeriodStart = ?");
      updateValues.push(currentPeriodStart);
    }
    if (currentPeriodEnd !== undefined && currentPeriodEnd !== null) {
      updateFields.push("currentPeriodEnd = ?");
      updateValues.push(currentPeriodEnd);
    }
    if (canceledAt !== undefined && canceledAt !== null) {
      updateFields.push("canceledAt = ?");
      updateValues.push(canceledAt);
    }

    // Always update cancelAtPeriodEnd (boolean, can be false)
    if (cancelAtPeriodEnd !== undefined) {
      updateFields.push("cancelAtPeriodEnd = ?");
      updateValues.push(cancelAtPeriodEnd || false);
    }

    // Form fields (optional - from checkout metadata)
    if (subject !== undefined && subject !== null) {
      updateFields.push("subject = ?");
      updateValues.push(subject);
    }
    if (mobile !== undefined && mobile !== null) {
      updateFields.push("mobile = ?");
      updateValues.push(mobile);
    }
    if (topix !== undefined && topix !== null) {
      updateFields.push("topix = ?");
      updateValues.push(topix);
    }
    if (descripton !== undefined && descripton !== null) {
      updateFields.push("descripton = ?");
      updateValues.push(descripton);
    }

    // Payment fields (optional)
    if (paymentDate !== undefined && paymentDate !== null) {
      updateFields.push("paymentDate = ?");
      updateValues.push(paymentDate);
    }
    if (stripeSessionId !== undefined && stripeSessionId !== null) {
      updateFields.push("stripeSessionId = ?");
      updateValues.push(stripeSessionId);
    }
    if (paymentAmount !== undefined && paymentAmount !== null) {
      updateFields.push("paymentAmount = ?");
      updateValues.push(paymentAmount);
    }

    // Set ispayed based on subscription status
    const isPaid =
      subscriptionStatus === "active" || subscriptionStatus === "trialing";
    updateFields.push("ispayed = ?");
    updateValues.push(isPaid);

    // Always update the updated timestamp
    updateFields.push("updated = CURRENT_TIMESTAMP");

    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE findtitor_premium_student 
        SET ${updateFields.join(", ")}
        WHERE ${lookupField} = ?
      `;

      updateValues.push(lookupValue);

      await executeQuery(updateQuery, updateValues);

      logger.info(
        `Updated subscription in database for student: ${studentEmail} (lookup by ${lookupField})`
      );
    }

    return {
      currentPeriodStart,
      currentPeriodEnd,
      paymentDate: paymentDate || new Date(),
    };
  } else {
    // No row found yet - re-check by email once more before INSERT to avoid duplicate rows
    // (e.g. concurrent subscription.created and invoice.payment_succeeded both inserting)
    const recheckByEmailQuery = `
      SELECT id FROM findtitor_premium_student WHERE email = ? LIMIT 1
    `;
    const recheckExisting = await executeQuery(recheckByEmailQuery, [studentEmail]);

    if (recheckExisting.length > 0) {
      // Row was created by another request (race) - update it instead of inserting
      logger.info(`Student subscription: row for ${studentEmail} appeared before INSERT, updating instead to avoid duplicate`);
      const existingId = recheckExisting[0].id;
      const updateFields = [];
      const updateValues = [];

      if (stripeCustomerId != null) {
        updateFields.push("stripeCustomerId = ?");
        updateValues.push(stripeCustomerId);
      }
      if (stripeSubscriptionId != null) {
        updateFields.push("stripeSubscriptionId = ?");
        updateValues.push(stripeSubscriptionId);
      }
      if (subscriptionStatus != null) {
        updateFields.push("subscriptionStatus = ?");
        updateValues.push(subscriptionStatus);
      }
      if (currentPeriodStart != null) {
        updateFields.push("currentPeriodStart = ?");
        updateValues.push(currentPeriodStart);
      }
      if (currentPeriodEnd != null) {
        updateFields.push("currentPeriodEnd = ?");
        updateValues.push(currentPeriodEnd);
      }
      if (canceledAt != null) {
        updateFields.push("canceledAt = ?");
        updateValues.push(canceledAt);
      }
      updateFields.push("cancelAtPeriodEnd = ?");
      updateValues.push(cancelAtPeriodEnd || false);
      if (subject != null) {
        updateFields.push("subject = ?");
        updateValues.push(subject);
      }
      if (mobile != null) {
        updateFields.push("mobile = ?");
        updateValues.push(mobile);
      }
      if (topix != null) {
        updateFields.push("topix = ?");
        updateValues.push(topix);
      }
      if (descripton != null) {
        updateFields.push("descripton = ?");
        updateValues.push(descripton);
      }
      if (paymentDate != null) {
        updateFields.push("paymentDate = ?");
        updateValues.push(paymentDate);
      }
      if (stripeSessionId != null) {
        updateFields.push("stripeSessionId = ?");
        updateValues.push(stripeSessionId);
      }
      if (paymentAmount != null) {
        updateFields.push("paymentAmount = ?");
        updateValues.push(paymentAmount);
      }
      const isPaid = subscriptionStatus === "active" || subscriptionStatus === "trialing";
      updateFields.push("ispayed = ?");
      updateValues.push(isPaid);
      updateFields.push("updated = CURRENT_TIMESTAMP");
      updateValues.push(existingId);

      await executeQuery(
        `UPDATE findtitor_premium_student SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );

      const updateStudentStatusQuery = `UPDATE Students SET hasPremium = 1 WHERE email = ?`;
      await executeQuery(updateStudentStatusQuery, [studentEmail]);

      return {
        currentPeriodStart,
        currentPeriodEnd,
        paymentDate: paymentDate || new Date(),
      };
    }

    // Create new record (no row for this email exists)
    const id = await generateId();
    const actualPaymentDate = paymentDate || new Date();
    const insertQuery = `
      INSERT INTO findtitor_premium_student 
      (id, email, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, 
       currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, canceledAt, ispayed,
       subject, mobile, topix, descripton, paymentDate, stripeSessionId, paymentAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const isPaid =
      subscriptionStatus === "active" || subscriptionStatus === "trialing";

    await executeQuery(insertQuery, [
      id,
      studentEmail,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd || false,
      canceledAt,
      isPaid,
      subject || null,
      mobile || null,
      topix || null,
      descripton || null,
      actualPaymentDate,
      stripeSessionId || null,
      paymentAmount || null,
    ]);

    // update student status to has premium
    const updateStudentStatusQuery = `
      UPDATE Students SET hasPremium = 1 WHERE email = ?
    `;
    await executeQuery(updateStudentStatusQuery, [studentEmail]);

    logger.info(
      `Created subscription record in database for student: ${studentEmail}`
    );
  }

  return {
    studentEmail,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    paymentDate: paymentDate || new Date(),
  };
};

/**
 * Cancel student subscription
 * @param {String} studentEmail - Student email
 * @param {Boolean} cancelAtPeriodEnd - Whether to cancel at period end
 * @returns {Promise<Object>} - Canceled subscription
 */
const cancelStudentSubscription = async (
  studentEmail,
  cancelAtPeriodEnd = false
) => {
  // Get subscription ID from database
  const query = `
    SELECT stripeSubscriptionId 
    FROM findtitor_premium_student 
    WHERE email = ? AND stripeSubscriptionId IS NOT NULL
    LIMIT 1
  `;
  const records = await executeQuery(query, [studentEmail]);

  if (records.length === 0 || !records[0].stripeSubscriptionId) {
    throw new Error("No active subscription found for this student");
  }

  const subscriptionId = records[0].stripeSubscriptionId;

  // Cancel in Stripe
  const canceledSubscription = await stripeService.cancelSubscription(
    subscriptionId,
    cancelAtPeriodEnd
  );

  // Update database
  await updateStudentSubscriptionInDatabase({
    studentEmail,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: cancelAtPeriodEnd
      ? canceledSubscription.status
      : "canceled",
    currentPeriodStart: canceledSubscription.current_period_start
      ? new Date(canceledSubscription.current_period_start * 1000)
      : null,
    currentPeriodEnd: canceledSubscription.current_period_end
      ? new Date(canceledSubscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: cancelAtPeriodEnd,
    canceledAt: cancelAtPeriodEnd ? null : new Date(),
    stripeCustomerId: canceledSubscription.customer,
  });

  logger.info(
    `Canceled subscription for student: ${studentEmail}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`
  );

  return canceledSubscription;
};

/**
 * Reactivate student subscription
 * @param {String} studentEmail - Student email
 * @returns {Promise<Object>} - Reactivated subscription
 */
const reactivateStudentSubscription = async (studentEmail) => {
  // Get subscription ID from database
  const query = `
    SELECT stripeSubscriptionId 
    FROM findtitor_premium_student 
    WHERE email = ? AND stripeSubscriptionId IS NOT NULL
    LIMIT 1
  `;
  const records = await executeQuery(query, [studentEmail]);

  if (records.length === 0 || !records[0].stripeSubscriptionId) {
    throw new Error("No subscription found for this student");
  }

  const subscriptionId = records[0].stripeSubscriptionId;

  // Reactivate in Stripe
  const reactivatedSubscription = await stripeService.reactivateSubscription(
    subscriptionId
  );

  // Update database
  await updateStudentSubscriptionInDatabase({
    studentEmail,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: reactivatedSubscription.status,
    currentPeriodStart: reactivatedSubscription.current_period_start
      ? new Date(reactivatedSubscription.current_period_start * 1000)
      : null,
    currentPeriodEnd: reactivatedSubscription.current_period_end
      ? new Date(reactivatedSubscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeCustomerId: reactivatedSubscription.customer,
  });

  logger.info(`Reactivated subscription for student: ${studentEmail}`);

  return reactivatedSubscription;
};

/**
 * Get invoice history for student
 * @param {String} studentEmail - Student email
 * @returns {Promise<Array>} - Invoice history
 */
const getStudentInvoiceHistory = async (studentEmail) => {
  // Get customer ID from database
  const query = `
    SELECT stripeCustomerId 
    FROM findtitor_premium_student 
    WHERE email = ? AND stripeCustomerId IS NOT NULL
    LIMIT 1
  `;
  const records = await executeQuery(query, [studentEmail]);

  if (records.length === 0 || !records[0].stripeCustomerId) {
    return [];
  }

  const customerId = records[0].stripeCustomerId;

  // Get invoices from Stripe
  const invoices = await stripeService.getCustomerInvoices(customerId);

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    amount: invoice.amount_paid / 100, // Convert from cents to dollars
    currency: invoice.currency.toUpperCase(),
    status: invoice.status,
    created: new Date(invoice.created * 1000),
    periodStart: invoice.currentPeriodStart
      ? new Date(invoice.currentPeriodStart * 1000)
      : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    invoicePdf: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  }));
};

module.exports = {
  createOrRetrieveCustomer,
  getSubscriptionStatus,
  updateSubscriptionInDatabase,
  cancelSubscription,
  reactivateSubscription,
  getInvoiceHistory,
  createOrRetrieveStudentCustomer,
  getStudentSubscriptionStatus,
  updateStudentSubscriptionInDatabase,
  cancelStudentSubscription,
  reactivateStudentSubscription,
  getStudentInvoiceHistory,
};
