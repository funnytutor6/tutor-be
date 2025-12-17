const stripe = require("../config/stripe");
const constants = require("../config/constants");
const logger = require("../utils/logger");

// Cache for product and price IDs
let teacherPremiumProductId = null;
let teacherPremiumPriceId = null;
let studentPremiumProductId = null;
let studentPremiumPriceId = null;

/**
 * Get or create Stripe Product and Price for teacher premium subscription
 * @returns {Promise<{productId: string, priceId: string}>}
 */
const getOrCreateTeacherPremiumPrice = async () => {
  if (teacherPremiumPriceId && teacherPremiumProductId) {
    return {
      productId: teacherPremiumProductId,
      priceId: teacherPremiumPriceId,
    };
  }

  try {
    // Try to find existing product
    const products = await stripe.products.search({
      query: 'name:"Premium Teaching Subscription" AND active:"true"',
    });

    if (products.data.length > 0) {
      const product = products.data[0];
      teacherPremiumProductId = product.id;

      // Find existing price for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length > 0) {
        teacherPremiumPriceId = prices.data[0].id;
        return {
          productId: teacherPremiumProductId,
          priceId: teacherPremiumPriceId,
        };
      }
    }

    // Create new product and price if not found
    const product = await stripe.products.create({
      name: "Premium Teaching Subscription",
      description:
        "Premium subscription with video showcase and direct contact features",
      images: [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400",
      ],
    });

    teacherPremiumProductId = product.id;

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2900, // $29.00 in cents
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });

    teacherPremiumPriceId = price.id;

    logger.info(
      "Created Stripe product and price for teacher premium subscription"
    );

    return {
      productId: teacherPremiumProductId,
      priceId: teacherPremiumPriceId,
    };
  } catch (error) {
    logger.error("Error creating/getting Stripe product/price:", error);
    throw error;
  }
};

/**
 * Create or retrieve Stripe Customer
 * @param {String} email - Customer email
 * @param {String} name - Customer name
 * @returns {Promise<String>} - Stripe customer ID
 */
const createOrRetrieveCustomer = async (email, name) => {
  try {
    // Search for existing customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: email,
      name: name,
    });

    logger.info("Created Stripe customer:", customer.id);
    return customer.id;
  } catch (error) {
    logger.error("Error creating/retrieving Stripe customer:", error);
    throw error;
  }
};

/**
 * Create checkout session for contact purchase
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} - Stripe checkout session
 */
const createContactPurchaseSession = async (sessionData) => {
  const { requestId, teacherId } = sessionData;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Student Contact Information",
            description:
              "Access to student contact details for tutoring connection",
          },
          unit_amount: 700, // $7.00 in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${constants.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}&teacher_id=${teacherId}`,
    cancel_url: `${constants.FRONTEND_URL}/cancel`,
    metadata: {
      type: "contact_purchase",
      requestId: requestId.toString(),
      teacherId: teacherId.toString(),
    },
  });

  logger.info("Contact purchase checkout session created:", session.id);
  return session;
};

/**
 * Create checkout session for teacher purchase
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} - Stripe checkout session
 */
const createTeacherPurchaseSession = async (sessionData) => {
  const { studentPostId, teacherId, studentId, postDetails } = sessionData;

  const productName = postDetails
    ? `Student Contact: ${postDetails.studentName} - ${postDetails.subject}`
    : "Student Contact Information";

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: productName,
            description: postDetails
              ? `Access to student contact details for: ${postDetails.headline}`
              : "Access to student contact details",
          },
          unit_amount: 500, // $5.00 in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${constants.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&request_id=${studentPostId}&teacher_id=${teacherId}&type=teacher_purchase`,
    cancel_url: `${constants.FRONTEND_URL}/cancel`,
    metadata: {
      type: "teacher_purchase",
      studentPostId: studentPostId.toString(),
      teacherId: teacherId.toString(),
      studentId: studentId.toString(),
    },
  });

  logger.info("Teacher purchase checkout session created:", session.id);
  return session;
};

/**
 * Create checkout session for teacher premium subscription
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} - Stripe checkout session
 */
const createTeacherPremiumSession = async (sessionData) => {
  const { teacherEmail, teacherName, stripeCustomerId } = sessionData;

  // Get or create product and price
  const { priceId } = await getOrCreateTeacherPremiumPrice();

  // Create or retrieve customer
  let customerId = stripeCustomerId;
  if (!customerId) {
    customerId = await createOrRetrieveCustomer(teacherEmail, teacherName);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${
      constants.FRONTEND_URL
    }/premium-success?session_id={CHECKOUT_SESSION_ID}&teacher_email=${encodeURIComponent(
      teacherEmail
    )}`,
    cancel_url: `${constants.FRONTEND_URL}/dashboard/teacher?tab=premium&cancelled=true`,
    metadata: {
      type: "premium_subscription",
      teacherEmail: teacherEmail,
      teacherName: teacherName || "",
    },
    subscription_data: {
      metadata: {
        teacherEmail: teacherEmail,
        teacherName: teacherName || "",
      },
    },
  });

  logger.info(
    "Teacher premium subscription checkout session created:",
    session.id
  );
  return session;
};

/**
 * Get or create Stripe Product and Price for student premium subscription
 * @returns {Promise<{productId: string, priceId: string}>}
 */
const getOrCreateStudentPremiumPrice = async () => {
  if (studentPremiumPriceId && studentPremiumProductId) {
    return {
      productId: studentPremiumProductId,
      priceId: studentPremiumPriceId,
    };
  }

  try {
    // Try to find existing product
    const products = await stripe.products.search({
      query: 'name:"Premium Student Subscription" AND active:"true"',
    });

    if (products.data.length > 0) {
      const product = products.data[0];
      studentPremiumProductId = product.id;

      // Find existing price for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length > 0) {
        studentPremiumPriceId = prices.data[0].id;
        return {
          productId: studentPremiumProductId,
          priceId: studentPremiumPriceId,
        };
      }
    }

    // Create new product and price if not found
    const product = await stripe.products.create({
      name: "Premium Student Subscription",
      description:
        "Premium student subscription with 2 free lessons per month and teacher matching",
      images: [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400",
      ],
    });

    studentPremiumProductId = product.id;

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2900, // $29.00 in cents
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });

    studentPremiumPriceId = price.id;

    logger.info(
      "Created Stripe product and price for student premium subscription"
    );

    return {
      productId: studentPremiumProductId,
      priceId: studentPremiumPriceId,
    };
  } catch (error) {
    logger.error(
      "Error creating/getting Stripe product/price for student:",
      error
    );
    throw error;
  }
};

/**
 * Create checkout session for student premium subscription
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} - Stripe checkout session
 */
const createStudentPremiumSession = async (sessionData) => {
  const { studentData, studentName, stripeCustomerId } = sessionData;

  // Get or create product and price
  const { priceId } = await getOrCreateStudentPremiumPrice();

  console.log("priceId", priceId);
  // Create or retrieve customer
  let customerId = stripeCustomerId;
  if (!customerId) {
    customerId = await createOrRetrieveCustomer(
      studentData.email,
      studentName || studentData.email
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${
      constants.FRONTEND_URL
    }/student-premium-success?session_id={CHECKOUT_SESSION_ID}&student_email=${encodeURIComponent(
      studentData.email
    )}`,
    cancel_url: `${constants.FRONTEND_URL}/dashboard/student?tab=subscriptions&cancelled=true`,
    metadata: {
      type: "student_premium_subscription",
      studentEmail: studentData.email,
      subject: studentData.subject || "",
      mobile: studentData.mobile || "",
      topix: studentData.topix || "",
      descripton: studentData.descripton || "",
    },
    subscription_data: {
      metadata: {
        type: "student_premium_subscription",
        studentEmail: studentData.email,
        subject: studentData.subject || "",
        mobile: studentData.mobile || "",
        topix: studentData.topix || "",
        descripton: studentData.descripton || "",
      },
    },
  });

  logger.info(
    "Student premium subscription checkout session created:",
    session.id
  );
  return session;
};

/**
 * Retrieve checkout session
 * @param {String} sessionId - Stripe session ID
 * @returns {Promise<Object>} - Stripe checkout session
 */
const retrieveSession = async (sessionId) => {
  return await stripe.checkout.sessions.retrieve(sessionId);
};

/**
 * Retrieve subscription
 * @param {String} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} - Stripe subscription
 */
const retrieveSubscription = async (subscriptionId) => {
  return await stripe.subscriptions.retrieve(subscriptionId);
};

/**
 * Cancel subscription
 * @param {String} subscriptionId - Stripe subscription ID
 * @param {Boolean} cancelAtPeriodEnd - Whether to cancel at period end
 * @returns {Promise<Object>} - Canceled subscription
 */
const cancelSubscription = async (
  subscriptionId,
  cancelAtPeriodEnd = false
) => {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
};

/**
 * Reactivate subscription
 * @param {String} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} - Reactivated subscription
 */
const reactivateSubscription = async (subscriptionId) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
};

/**
 * Get customer subscriptions
 * @param {String} customerId - Stripe customer ID
 * @returns {Promise<Array>} - List of subscriptions
 */
const getCustomerSubscriptions = async (customerId) => {
  return await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
  });
};

/**
 * Get customer invoices
 * @param {String} customerId - Stripe customer ID
 * @returns {Promise<Array>} - List of invoices
 */
const getCustomerInvoices = async (customerId) => {
  return await stripe.invoices.list({
    customer: customerId,
    limit: 100,
  });
};

module.exports = {
  createContactPurchaseSession,
  createTeacherPurchaseSession,
  createTeacherPremiumSession,
  createStudentPremiumSession,
  retrieveSession,
  retrieveSubscription,
  cancelSubscription,
  reactivateSubscription,
  getCustomerSubscriptions,
  getCustomerInvoices,
  createOrRetrieveCustomer,
  getOrCreateTeacherPremiumPrice,
  getOrCreateStudentPremiumPrice,
};
