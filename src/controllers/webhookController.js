const connectionService = require("../services/connectionService");
const purchaseService = require("../services/purchaseService");
const premiumService = require("../services/premiumService");
const subscriptionService = require("../services/subscriptionService");
const stripeService = require("../services/stripeService");
const emailService = require("../services/emailService");
const { executeQuery } = require("../services/databaseService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Handle Stripe webhook
 */
exports.handleWebhook = async (req, res) => {
  const stripe = require("../config/stripe");
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    logger.info("Webhook signature verified");
  } catch (err) {
    logger.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info("Received webhook event:", { type: event.type, id: event.id });
  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    logger.error("Error processing webhook:", error);
  }

  res.json({ received: true });
};

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(session) {
  logger.info("Processing checkout session completed:", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    metadata: session.metadata,
  });

  const { type } = session.metadata;

  if (type === "contact_purchase") {
    await handleContactPurchase(session);
  } else if (type === "premium_subscription") {
    // For subscriptions, checkout.session.completed happens first
    // The subscription will be created separately via customer.subscription.created
    // But we can still handle the initial payment here if needed
    if (session.mode === "subscription" && session.subscription) {
      // Subscription was created, will be handled by customer.subscription.created
      logger.info(
        "Subscription checkout completed, waiting for subscription.created event"
      );
    } else {
      // Legacy one-time payment
      await handleTeacherPremiumSubscription(session);
    }
  } else if (type === "student_premium_subscription") {
    // For subscriptions, checkout.session.completed happens first
    // The subscription will be created separately via customer.subscription.created
    // But we can still handle the initial payment here if needed
    if (session.mode === "subscription" && session.subscription) {
      // Subscription was created, will be handled by customer.subscription.created
      logger.info(
        "Student subscription checkout completed, waiting for subscription.created event"
      );
    } else {
      // Legacy one-time payment
      await handleStudentPremiumSubscription(session);
    }
  } else if (type === "teacher_purchase") {
    await handleTeacherPurchase(session);
  } else {
    logger.error("Unknown payment type:", type);
  }
}

/**
 * Resolve subscription metadata - tries subscription.metadata first,
 * then falls back to checkout session metadata if subscription metadata is empty
 * @param {Object} stripe - Stripe instance
 * @param {Object} subscription - Stripe subscription object
 * @returns {Promise<Object>} - Resolved metadata
 */
async function resolveSubscriptionMetadata(stripe, subscription) {
  const subscriptionMetadata = subscription.metadata || {};
  
  // If metadata has type or studentEmail, use it directly
  if (subscriptionMetadata.type || subscriptionMetadata.studentEmail || subscriptionMetadata.teacherEmail) {
    return subscriptionMetadata;
  }
  
  // Metadata is empty or missing key fields - try to get from checkout session
  logger.warn(`Subscription ${subscription.id} has empty/incomplete metadata, attempting to resolve from checkout session`);
  
  try {
    // List checkout sessions filtered by subscription
    const sessions = await stripe.checkout.sessions.list({
      subscription: subscription.id,
      limit: 1,
    });
    
    if (sessions.data.length > 0) {
      const sessionMetadata = sessions.data[0].metadata || {};
      logger.info(`Resolved metadata from checkout session for subscription ${subscription.id}:`, sessionMetadata);
      return sessionMetadata;
    }
  } catch (error) {
    logger.warn(`Could not retrieve checkout session for subscription ${subscription.id}:`, error.message);
  }
  
  // Return original metadata if fallback fails
  return subscriptionMetadata;
}

/**
 * Get the checkout session that created this subscription (for session id and amount)
 * @param {Object} stripe - Stripe instance
 * @param {String} subscriptionId - Stripe subscription ID
 * @returns {Promise<{sessionId: string|null, paymentAmount: number|null}>}
 */
async function getCheckoutSessionForSubscription(stripe, subscriptionId) {
  try {
    const sessions = await stripe.checkout.sessions.list({
      subscription: subscriptionId,
      limit: 1,
    });
    if (sessions.data.length > 0) {
      const session = sessions.data[0];
      const amountTotal = session.amount_total != null ? session.amount_total / 100 : null;
      return {
        sessionId: session.id,
        paymentAmount: amountTotal,
      };
    }
  } catch (error) {
    logger.warn(`Could not get checkout session for subscription ${subscriptionId}:`, error.message);
  }
  return { sessionId: null, paymentAmount: null };
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  logger.info("Processing subscription created:", {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    metadata: subscription.metadata,
  });

  try {
    // Get customer email from Stripe
    const stripe = require("../config/stripe");
    const customer = await stripe.customers.retrieve(subscription.customer);
    const email = customer.email;

    if (!email) {
      logger.error("No email found for customer:", subscription.customer);
      return;
    }

    // Resolve subscription metadata (with fallback to checkout session)
    const subscriptionMetadata = await resolveSubscriptionMetadata(stripe, subscription);

    // Get checkout session for this subscription (stripeSessionId and paymentAmount)
    const { sessionId: stripeSessionId, paymentAmount } = await getCheckoutSessionForSubscription(stripe, subscription.id);

    // Check subscription metadata to determine if it's student or teacher
    const isStudentSubscription =
      subscriptionMetadata.studentEmail ||
      subscriptionMetadata.type === "student_premium_subscription";

    if (isStudentSubscription) {
      const studentEmail = subscriptionMetadata.studentEmail || email;

      // Extract form data from checkout session metadata
      const { subject, mobile, topix, descripton } = subscriptionMetadata;

      // Update student subscription in database with form data and payment info
      await subscriptionService.updateStudentSubscriptionInDatabase({
        studentEmail,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        // Form data from checkout metadata
        subject: subject || null,
        mobile: mobile || null,
        topix: topix || null,
        descripton: descripton || null,
        // Payment date (subscription start)
        paymentDate: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : new Date(),
        stripeSessionId: stripeSessionId || null,
        paymentAmount: paymentAmount != null ? paymentAmount : null,
      });

      logger.info(`Subscription created for student: ${studentEmail}`);
    } else {
      // Teacher subscription
      await subscriptionService.updateSubscriptionInDatabase({
        teacherEmail: email,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        // Payment date (subscription start)
        paymentDate: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : new Date(),
        stripeSessionId: stripeSessionId || null,
        paymentAmount: paymentAmount != null ? paymentAmount : null,
      });

      logger.info(`Subscription created for teacher: ${email}`);
    }
  } catch (error) {
    logger.error("Error handling subscription created:", error);
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
  logger.info("Processing subscription updated:", {
    subscriptionId: subscription.id,
    status: subscription.status,
    metadata: subscription.metadata,
  });

  try {
    // Get customer email from Stripe
    const stripe = require("../config/stripe");
    const customer = await stripe.customers.retrieve(subscription.customer);
    const email = customer.email;

    if (!email) {
      logger.error("No email found for customer:", subscription.customer);
      return;
    }

    // Resolve subscription metadata (with fallback to checkout session)
    const subscriptionMetadata = await resolveSubscriptionMetadata(stripe, subscription);
    
    // Check subscription metadata to determine if it's student or teacher
    const isStudentSubscription =
      subscriptionMetadata.studentEmail ||
      subscriptionMetadata.type === "student_premium_subscription";

    if (isStudentSubscription) {
      const studentEmail = subscriptionMetadata.studentEmail || email;

      // Update student subscription in database
      await subscriptionService.updateStudentSubscriptionInDatabase({
        studentEmail,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      });

      logger.info(`Subscription updated for student: ${studentEmail}`);
    } else {
      // Teacher subscription
      await subscriptionService.updateSubscriptionInDatabase({
        teacherEmail: email,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      });

      logger.info(`Subscription updated for teacher: ${email}`);
    }
  } catch (error) {
    logger.error("Error handling subscription updated:", error);
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
  logger.info("Processing subscription deleted:", {
    subscriptionId: subscription.id,
    metadata: subscription.metadata,
  });

  try {
    // Get customer email from Stripe
    const stripe = require("../config/stripe");
    const customer = await stripe.customers.retrieve(subscription.customer);
    const email = customer.email;

    if (!email) {
      logger.error("No email found for customer:", subscription.customer);
      return;
    }

    // Resolve subscription metadata (with fallback to checkout session)
    const subscriptionMetadata = await resolveSubscriptionMetadata(stripe, subscription);
    
    // Check subscription metadata to determine if it's student or teacher
    const isStudentSubscription =
      subscriptionMetadata.studentEmail ||
      subscriptionMetadata.type === "student_premium_subscription";

    if (isStudentSubscription) {
      const studentEmail = subscriptionMetadata.studentEmail || email;

      // Update student subscription in database
      await subscriptionService.updateStudentSubscriptionInDatabase({
        studentEmail,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: "canceled",
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : new Date(),
      });


      // Get student name from database
      let studentName = "Student";
      try {
        const studentQuery = "SELECT name FROM Students WHERE email = ? LIMIT 1";
        const students = await executeQuery(studentQuery, [studentEmail]);
        if (students.length > 0) {
          studentName = students[0].name || studentName;
        }
      } catch (error) {
        // Ignore error
      }

      await emailService.sendStudentSubscriptionCanceled({
        studentEmail,
        studentName,
        cancellationDate: new Date().toLocaleDateString(),
        periodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
          : "End of billing period",
      });

      logger.info(`Subscription deleted for student: ${studentEmail}`);
    } else {
      // Teacher subscription
      await subscriptionService.updateSubscriptionInDatabase({
        teacherEmail: email,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: "canceled",
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : new Date(),
      });

      // Get teacher name from database
      let teacherName = "Tutor";
      try {
        const teacherQuery = "SELECT name FROM Teachers WHERE email = ? LIMIT 1";
        const teachers = await executeQuery(teacherQuery, [email]);
        if (teachers.length > 0) {
          teacherName = teachers[0].name || teacherName;
        }
      } catch (error) {
        // Ignore error
      }

      await emailService.sendTeacherSubscriptionCanceled({
        teacherEmail: email,
        teacherName,
        cancellationDate: new Date().toLocaleDateString(),
        periodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
          : "End of billing period",
      });

      logger.info(`Subscription deleted for teacher: ${email}`);
    }
  } catch (error) {
    logger.error("Error handling subscription deleted:", error);
  }
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(invoice) {
  logger.info("Processing invoice payment succeeded:", {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
    billingReason: invoice.billing_reason,
  });

  try {
    if (!invoice.subscription) {
      // Not a subscription invoice
      return;
    }

    // Get subscription from Stripe
    const stripe = require("../config/stripe");
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription
    );
    const customer = await stripe.customers.retrieve(invoice.customer);
    const email = customer.email;

    if (!email) {
      logger.error("No email found for customer:", invoice.customer);
      return;
    }

    // Resolve subscription metadata (with fallback to checkout session)
    const subscriptionMetadata = await resolveSubscriptionMetadata(stripe, subscription);
    
    // Check subscription metadata to determine if it's student or teacher
    const isStudentSubscription =
      subscriptionMetadata.studentEmail ||
      subscriptionMetadata.type === "student_premium_subscription";

    // For subscription_create, the subscription.created event already updated the DB
    // So we skip DB update here to avoid races and duplicate writes
    // For renewals (subscription_cycle), we do update the DB with new period dates
    const isInitialInvoice = invoice.billing_reason === "subscription_create";

    if (isInitialInvoice) {
      logger.info(`Skipping DB update for initial invoice (billing_reason: subscription_create), subscription already created by subscription.created event`);
    }

    if (isStudentSubscription) {
      const studentEmail = subscriptionMetadata.studentEmail || email;

      let updatedSubscription = {
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        paymentDate: new Date(invoice.created * 1000),
      };

      // Only update DB for renewal invoices, not for initial subscription creation
      if (!isInitialInvoice) {
        updatedSubscription = await subscriptionService.updateStudentSubscriptionInDatabase({
          studentEmail,
          stripeCustomerId: invoice.customer,
          stripeSubscriptionId: invoice.subscription,
          subscriptionStatus: subscription.status,
          currentPeriodStart: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000)
            : null,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
          // Payment date from invoice
          paymentDate: new Date(invoice.created * 1000),
          paymentAmount: invoice.amount_paid / 100,
        });
      }

      logger.info(`Invoice payment succeeded for student: ${studentEmail} (billing_reason: ${invoice.billing_reason})`);

      // Get student name from database
      let studentName = "Student";
      try {
        const studentQuery = "SELECT name FROM Students WHERE email = ? LIMIT 1";
        const students = await executeQuery(studentQuery, [studentEmail]);
        if (students.length > 0) {
          studentName = students[0].name || studentName;
        }
      } catch (error) {
        logger.warn(`Could not fetch student name for ${studentEmail}:`, error);
      }

      // Format payment details
      const paymentAmount = `$${(invoice.amount_paid / 100).toFixed(2)}`;
      const paymentDate = updatedSubscription.paymentDate || new Date(invoice.created * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const periodStart = updatedSubscription.currentPeriodStart || subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      const subscriptionPeriod = `${periodStart} - ${periodEnd}`;
      const nextBillingDate = updatedSubscription.currentPeriodEnd || subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      // Send payment success email 
      await emailService.sendStudentSubscriptionPaymentSuccess({
        studentEmail,
        studentName,
        invoiceNumber: invoice.number || invoice.id,
        paymentAmount,
        paymentDate,
        subscriptionPeriod,
        nextBillingDate,
        invoiceUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || "",
      }).catch((error) => {
        logger.error("Error sending student subscription payment success email:", error);
      });
    } else {
      // Teacher subscription
      let updatedSubscription = {
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        paymentDate: new Date(invoice.created * 1000),
      };

      // Only update DB for renewal invoices, not for initial subscription creation
      if (!isInitialInvoice) {
        updatedSubscription = await subscriptionService.updateSubscriptionInDatabase({
          teacherEmail: email,
          stripeCustomerId: invoice.customer,
          stripeSubscriptionId: invoice.subscription,
          subscriptionStatus: subscription.status,
          currentPeriodStart: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000)
            : null,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
          // Payment date from invoice
          paymentDate: new Date(invoice.created * 1000),
          paymentAmount: invoice.amount_paid / 100,
        });
      }

      logger.info(`Invoice payment succeeded for teacher: ${email} (billing_reason: ${invoice.billing_reason})`);

      // Get teacher name from database
      let teacherName = "Tutor";
      try {
        const teacherQuery = "SELECT name FROM Teachers WHERE email = ? LIMIT 1";
        const teachers = await executeQuery(teacherQuery, [email]);
        if (teachers.length > 0) {
          teacherName = teachers[0].name || teacherName;
        }
      } catch (error) {
        logger.warn(`Could not fetch teacher name for ${email}:`, error);
      }

      // Format payment details
      const paymentAmount = `$${(invoice.amount_paid / 100).toFixed(2)}`;
      const paymentDate = updatedSubscription.paymentDate || new Date(invoice.created * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const periodStart = updatedSubscription.currentPeriodStart || subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      const subscriptionPeriod = `${periodStart} - ${periodEnd}`;
      const nextBillingDate = updatedSubscription.currentPeriodEnd || subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      // Send payment success email
      await emailService.sendTeacherSubscriptionPaymentSuccess({
        teacherEmail: email,
        teacherName,
        invoiceNumber: invoice.number || invoice.id,
        paymentAmount,
        paymentDate,
        subscriptionPeriod,
        nextBillingDate,
        invoiceUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || "",
      }).catch((error) => {
        logger.error("Error sending teacher subscription payment success email:", error);
      });
    }
  } catch (error) {
    logger.error("Error handling invoice payment succeeded:", error);
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice) {
  logger.info("Processing invoice payment failed:", {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
  });

  try {
    if (!invoice.subscription) {
      // Not a subscription invoice
      return;
    }

    // Get subscription from Stripe
    const stripe = require("../config/stripe");
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription
    );
    const customer = await stripe.customers.retrieve(invoice.customer);
    const email = customer.email;

    if (!email) {
      logger.error("No email found for customer:", invoice.customer);
      return;
    }

    // Resolve subscription metadata (with fallback to checkout session)
    const subscriptionMetadata = await resolveSubscriptionMetadata(stripe, subscription);
    
    // Check subscription metadata to determine if it's student or teacher
    const isStudentSubscription =
      subscriptionMetadata.studentEmail ||
      subscriptionMetadata.type === "student_premium_subscription";

    // Update subscription status to past_due or unpaid
    const newStatus =
      subscription.status === "past_due" ? "past_due" : "unpaid";

    if (isStudentSubscription) {
      const studentEmail = subscriptionMetadata.studentEmail || email;

      const updatedSubscription = await subscriptionService.updateStudentSubscriptionInDatabase({
        studentEmail,
        stripeCustomerId: invoice.customer,
        stripeSubscriptionId: invoice.subscription,
        subscriptionStatus: newStatus,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      });

      // Get student name from database
      let studentName = "Student";
      try {
        const studentQuery = "SELECT name FROM Students WHERE email = ? LIMIT 1";
        const students = await executeQuery(studentQuery, [studentEmail]);
        if (students.length > 0) {
          studentName = students[0].name || studentName;
        }
      } catch (error) {
        // Ignore error
      }

      await emailService.sendStudentPaymentFailed({
        studentEmail,
        studentName,
        paymentAmount: `$${(invoice.amount_due / 100).toFixed(2)}`,
        paymentDate: updatedSubscription.paymentDate || new Date(invoice.created * 1000).toLocaleDateString(),
        invoiceUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || "",
      });

      logger.warn(`Invoice payment failed for student: ${studentEmail}`);
    } else {
      // Teacher subscription
      const updatedSubscription = await subscriptionService.updateSubscriptionInDatabase({
        teacherEmail: email,
        stripeCustomerId: invoice.customer,
        stripeSubscriptionId: invoice.subscription,
        subscriptionStatus: newStatus,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      });

      // Get teacher name from database
      let teacherName = "Tutor";
      try {
        const teacherQuery = "SELECT name FROM Teachers WHERE email = ? LIMIT 1";
        const teachers = await executeQuery(teacherQuery, [email]);
        if (teachers.length > 0) {
          teacherName = teachers[0].name || teacherName;
        }
      } catch (error) {
        // Ignore error
      }

      await emailService.sendTeacherPaymentFailed({
        teacherEmail: email,
        teacherName,
        paymentAmount: `$${(invoice.amount_due / 100).toFixed(2)}`,
        paymentDate: updatedSubscription.paymentDate || new Date(invoice.created * 1000).toLocaleDateString(),
        invoiceUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || "",
      });

      logger.warn(`Invoice payment failed for teacher: ${email}`);
    }
  } catch (error) {
    logger.error("Error handling invoice payment failed:", error);
  }
}

/**
 * Handle contact purchase webhook
 */
async function handleContactPurchase(session) {
  const { requestId, teacherId } = session.metadata;

  if (!requestId || !teacherId) {
    logger.error(
      "Missing metadata in contact purchase session:",
      session.metadata
    );
    return;
  }

  await connectionService.purchaseConnectionRequest(
    requestId,
    teacherId,
    session.id
  );
}

/**
 * Handle teacher purchase webhook
 */
async function handleTeacherPurchase(session) {
  const { studentPostId, teacherId, studentId } = session.metadata;

  if (!studentPostId || !teacherId || !studentId) {
    logger.error(
      "Missing metadata in teacher purchase session:",
      session.metadata
    );
    return;
  }

  const paymentAmount = session.amount_total / 100; // Convert from cents to dollars

  await purchaseService.createOrUpdateTeacherPurchase({
    studentPostId,
    teacherId,
    studentId,
    stripeSessionId: session.id,
    paymentAmount,
  });

  // Get teacher and student details for email
  let teacherName = "Tutor";
  let teacherEmail = "";
  let studentName = "Student";
  let postSubject = "";
  let postHeadline = "";

  try {
    // Get teacher details
    const teacherQuery = "SELECT name, email FROM Teachers WHERE id = ? LIMIT 1";
    const teachers = await executeQuery(teacherQuery, [teacherId]);
    if (teachers.length > 0) {
      teacherName = teachers[0].name || teacherName;
      teacherEmail = teachers[0].email || "";
    }

    // Get student details
    const studentQuery = "SELECT name FROM Students WHERE id = ? LIMIT 1";
    const students = await executeQuery(studentQuery, [studentId]);
    if (students.length > 0) {
      studentName = students[0].name || studentName;
    }

    // Get post details
    const postQuery = "SELECT subject, headline FROM StudentPosts WHERE id = ? LIMIT 1";
    const posts = await executeQuery(postQuery, [studentPostId]);
    if (posts.length > 0) {
      postSubject = posts[0].subject || "";
      postHeadline = posts[0].headline || "";
    }
  } catch (error) {
    logger.warn("Could not fetch user/post details for email:", error);
  }

  // Format payment details
  const formattedPaymentAmount = `$${paymentAmount.toFixed(2)}`;
  const paymentDate = new Date(session.created * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Send payment success email
  if (teacherEmail) {
    await emailService.sendTeacherConnectionPurchaseSuccess({
      teacherEmail,
      teacherName,
      studentName,
      postSubject,
      postHeadline,
      transactionId: session.id,
      paymentAmount: formattedPaymentAmount,
      paymentDate,
    }).catch((error) => {
      logger.error("Error sending teacher connection purchase success email:", error);
    });
  }
}


/**
 * Handle teacher premium subscription webhook (legacy one-time payment)
 */
async function handleTeacherPremiumSubscription(session) {
  const { teacherEmail } = session.metadata;

  if (!teacherEmail) {
    logger.error(
      "Missing teacher email in premium subscription session:",
      session.metadata
    );
    return;
  }

  // Only handle one-time payments here
  // Subscriptions are handled by subscription events
  if (session.mode === "subscription") {
    logger.info("Subscription mode detected, skipping legacy payment handler");
    return;
  }

  const paymentAmount = session.amount_total / 100;

  await premiumService.updateTeacherPremiumAfterPayment({
    teacherEmail,
    stripeSessionId: session.id,
    paymentAmount,
  });

  // Get teacher name from database
  let teacherName = "Tutor";
  try {
    const teacherQuery = "SELECT name FROM Teachers WHERE email = ? LIMIT 1";
    const teachers = await executeQuery(teacherQuery, [teacherEmail]);
    if (teachers.length > 0) {
      teacherName = teachers[0].name || teacherName;
    }
  } catch (error) {
    // Ignore error
  }

  // Send one-time premium success email
  await emailService.sendTeacherPremiumOneTimeSuccess({
    teacherEmail,
    teacherName,
    paymentAmount: `$${paymentAmount.toFixed(2)}`,
    paymentDate: new Date(session.created * 1000).toLocaleDateString(),
    transactionId: session.id,
  });
}

/**
 * Handle student premium subscription webhook (legacy one-time payment)
 */
async function handleStudentPremiumSubscription(session) {
  const { studentEmail, subject, mobile, topix, descripton } = session.metadata;

  if (!studentEmail) {
    logger.error(
      "Missing student email in premium subscription session:",
      session.metadata
    );
    return;
  }

  // Only handle one-time payments here
  // Subscriptions are handled by subscription events
  if (session.mode === "subscription") {
    logger.info("Subscription mode detected, skipping legacy payment handler");
    return;
  }

  const paymentAmount = session.amount_total / 100;

  await premiumService.updateStudentPremiumAfterPayment({
    studentEmail,
    subject,
    mobile,
    topix,
    descripton,
    stripeSessionId: session.id,
    paymentAmount,
  });

  // Get student name from database
  let studentName = "Student";
  try {
    const studentQuery = "SELECT name FROM Students WHERE email = ? LIMIT 1";
    const students = await executeQuery(studentQuery, [studentEmail]);
    if (students.length > 0) {
      studentName = students[0].name || studentName;
    }
  } catch (error) {
    // Ignore error
  }

  // Send one-time premium success email
  await emailService.sendStudentPremiumOneTimeSuccess({
    studentEmail,
    studentName,
    paymentAmount: `$${paymentAmount.toFixed(2)}`,
    paymentDate: new Date(session.created * 1000).toLocaleDateString(),
    transactionId: session.id,
  });
}

/**
 * Check payment status
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await stripeService.retrieveSession(sessionId);

    return successResponse(res, {
      paymentStatus: session.payment_status,
      metadata: session.metadata,
      paymentType: session.metadata.type,
    });
  } catch (error) {
    logger.error("Error checking payment:", error);
    return errorResponse(res, "Failed to check payment status", 500);
  }
};

/**
 * Manual webhook trigger for testing
 */
exports.manualWebhookTrigger = async (req, res) => {
  try {
    const { sessionId, type } = req.body;

    if (!sessionId) {
      return errorResponse(res, "Session ID is required", 400);
    }

    logger.info("Manual webhook trigger for session:", sessionId);

    const session = await stripeService.retrieveSession(sessionId);

    if (!session) {
      return errorResponse(res, "Session not found", 404);
    }

    const event = {
      type: "checkout.session.completed",
      data: { object: session },
    };

    if (event.type === "checkout.session.completed") {
      const sessionData = event.data.object;
      const { type: sessionType } = sessionData.metadata;

      try {
        if (sessionType === "contact_purchase") {
          await handleContactPurchase(sessionData);
        } else if (sessionType === "premium_subscription") {
          await handleTeacherPremiumSubscription(sessionData);
        } else if (sessionType === "student_premium_subscription") {
          // For subscriptions, checkout.session.completed happens first
          // The subscription will be created separately via customer.subscription.created
          if (sessionData.mode === "subscription" && sessionData.subscription) {
            logger.info(
              "Student subscription checkout completed, waiting for subscription.created event"
            );
          } else {
            // Legacy one-time payment
            await handleStudentPremiumSubscription(sessionData);
          }
        } else if (sessionType === "teacher_purchase") {
          await handleTeacherPurchase(sessionData);
        }
      } catch (error) {
        logger.error("Error processing manual webhook:", error);
        return errorResponse(res, "Failed to process webhook", 500);
      }
    }

    return successResponse(res, {
      message: "Webhook processed successfully",
      sessionId: sessionId,
    });
  } catch (error) {
    logger.error("Error processing manual webhook:", error);
    return errorResponse(res, "Failed to process webhook", 500);
  }
};
