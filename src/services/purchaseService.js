const { executeQuery, generateId } = require("./databaseService");
const logger = require("../utils/logger");

/**
 * Get teacher purchases
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Array>} - List of purchases
 */
const getTeacherPurchases = async (teacherId) => {
  const query = `
    SELECT tp.*, sp.headline as postHeadline, sp.subject as postSubject,
           s.name as studentName, s.email as studentEmail, s.phoneNumber
    FROM TeacherPurchases tp
    JOIN StudentPosts sp ON tp.studentPostId = sp.id
    JOIN Students s ON tp.studentId = s.id
    WHERE tp.teacherId = ?
    ORDER BY tp.purchasedAt DESC
  `;
  return await executeQuery(query, [teacherId]);
};

/**
 * Check if teacher has purchased access to a post
 * @param {String} teacherId - Teacher ID
 * @param {String} studentPostId - Student post ID
 * @returns {Promise<Object>} - Purchase status
 */
const checkPurchaseStatus = async (teacherId, studentPostId) => {
  const checkQuery =
    "SELECT * FROM TeacherPurchases WHERE teacherId = ? AND studentPostId = ? AND paymentStatus = 'paid'";
  const existing = await executeQuery(checkQuery, [teacherId, studentPostId]);

  return {
    hasPurchased: existing.length > 0,
    purchase: existing.length > 0 ? existing[0] : null,
  };
};

/**
 * Get teacher purchase details
 * @param {String} studentPostId - Student post ID
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Object>} - Purchase details with student contact
 */
const getTeacherPurchaseDetails = async (studentPostId, teacherId) => {
  const query = `
    SELECT tp.*, s.name as studentName, s.email as studentEmail, s.phoneNumber as studentPhone, s.cityOrTown as studentLocation,
           sp.headline as postHeadline, sp.subject as postSubject
    FROM TeacherPurchases tp
    JOIN Students s ON tp.studentId = s.id
    JOIN StudentPosts sp ON tp.studentPostId = sp.id
    WHERE tp.studentPostId = ? AND tp.teacherId = ? AND tp.paymentStatus = 'paid'
  `;
  const purchases = await executeQuery(query, [studentPostId, teacherId]);

  if (purchases.length === 0) {
    throw new Error("Teacher purchase not found or not paid");
  }

  const purchase = purchases[0];

  return {
    id: purchase.id,
    studentPostId: purchase.studentPostId,
    teacherId: purchase.teacherId,
    studentId: purchase.studentId,
    paymentAmount: purchase.paymentAmount,
    paymentStatus: purchase.paymentStatus,
    phoneNumberAccess: purchase.phoneNumberAccess,
    purchasedAt: purchase.purchasedAt,
    studentName: purchase.studentName,
    studentEmail: purchase.studentEmail,
    studentPhone: purchase.studentPhone,
    studentLocation: purchase.studentLocation,
    postHeadline: purchase.postHeadline,
    postSubject: purchase.postSubject,
    contactRevealed: true,
  };
};

/**
 * Get student contact information after purchase
 * @param {String} postId - Post ID
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Object>} - Student contact information
 */
const getStudentContact = async (postId, teacherId) => {
  const purchaseQuery = `
    SELECT tp.*, s.name, s.email, s.phoneNumber, sp.subject, sp.headline
    FROM TeacherPurchases tp
    JOIN Students s ON tp.studentId = s.id
    JOIN StudentPosts sp ON tp.studentPostId = sp.id
    WHERE tp.studentPostId = ? AND tp.teacherId = ? AND tp.paymentStatus = 'paid'
  `;
  const purchases = await executeQuery(purchaseQuery, [postId, teacherId]);

  if (purchases.length === 0) {
    throw new Error("Contact access not purchased or not found");
  }

  const purchase = purchases[0];

  return {
    name: purchase.name,
    email: purchase.email,
    phoneNumber: purchase.phoneNumber,
    subject: purchase.subject,
    headline: purchase.headline,
  };
};

/**
 * Get student contact information for premium teachers (without purchase requirement)
 * @param {String} postId - Post ID
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Object>} - Student contact information
 */
const getStudentContactForPremium = async (postId, teacherId) => {
  const query = `
    SELECT s.name, s.email, s.phoneNumber, sp.subject, sp.headline
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    WHERE sp.id = ?
  `;
  const results = await executeQuery(query, [postId]);

  if (results.length === 0) {
    throw new Error("Student post not found");
  }

  const post = results[0];

  return {
    name: post.name,
    email: post.email,
    phoneNumber: post.phoneNumber,
    subject: post.subject,
    headline: post.headline,
  };
};

/**
 * Create free access purchase for premium teachers
 * @param {Object} purchaseData - Purchase data
 * @returns {Promise<String>} - Purchase ID
 */
const createFreeAccessPurchase = async (purchaseData) => {
  const {
    studentPostId,
    teacherId,
    studentId,
  } = purchaseData;

  // Check if purchase already exists
  const checkQuery =
    "SELECT * FROM TeacherPurchases WHERE teacherId = ? AND studentPostId = ?";
  const existing = await executeQuery(checkQuery, [teacherId, studentPostId]);

  if (existing.length > 0) {
    // Update existing purchase to paid status if not already paid
    if (existing[0].paymentStatus !== 'paid') {
      const updateQuery = `
        UPDATE TeacherPurchases 
        SET paymentStatus = 'paid', 
            phoneNumberAccess = TRUE, 
            paymentAmount = 0,
            purchasedAt = NOW(),
            updated = NOW()
        WHERE id = ?
      `;
      await executeQuery(updateQuery, [existing[0].id]);
    }
    logger.info("Free access purchase updated successfully:", existing[0].id);
    return existing[0].id;
  }

  // Create new free access purchase
  const purchaseId = await generateId();

  const createQuery = `
    INSERT INTO TeacherPurchases 
    (id, studentPostId, teacherId, studentId, paymentAmount, paymentStatus, phoneNumberAccess, stripeSessionId, purchasedAt, created, updated)
    VALUES (?, ?, ?, ?, 0, 'paid', TRUE, NULL, NOW(), NOW(), NOW())
  `;

  await executeQuery(createQuery, [
    purchaseId,
    studentPostId,
    teacherId,
    studentId,
  ]);

  logger.info("Free access purchase created successfully:", purchaseId);
  return purchaseId;
};

/**
 * Create or update teacher purchase after payment
 * @param {Object} purchaseData - Purchase data from Stripe webhook
 * @returns {Promise<String>} - Purchase ID
 */
const createOrUpdateTeacherPurchase = async (purchaseData) => {
  const {
    studentPostId,
    teacherId,
    studentId,
    stripeSessionId,
    paymentAmount,
  } = purchaseData;

  // Check if purchase already exists
  const checkQuery =
    "SELECT * FROM TeacherPurchases WHERE teacherId = ? AND studentPostId = ?";
  const existing = await executeQuery(checkQuery, [teacherId, studentPostId]);

  if (existing.length > 0) {
    // Update existing purchase
    const updateQuery = `
      UPDATE TeacherPurchases 
      SET paymentStatus = 'paid', 
          phoneNumberAccess = TRUE, 
          stripeSessionId = ?,
          purchasedAt = NOW(),
          updated = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [stripeSessionId, existing[0].id]);

    logger.info("Teacher purchase updated successfully:", existing[0].id);
    return existing[0].id;
  }

  // Create new purchase
  const purchaseId = await generateId();

  const createQuery = `
    INSERT INTO TeacherPurchases 
    (id, studentPostId, teacherId, studentId, paymentAmount, paymentStatus, phoneNumberAccess, stripeSessionId, purchasedAt, created, updated)
    VALUES (?, ?, ?, ?, ?, 'paid', TRUE, ?, NOW(), NOW(), NOW())
  `;

  await executeQuery(createQuery, [
    purchaseId,
    studentPostId,
    teacherId,
    studentId,
    paymentAmount,
    stripeSessionId,
  ]);

  logger.info("Teacher purchase created successfully:", purchaseId);
  return purchaseId;
};

module.exports = {
  getTeacherPurchases,
  checkPurchaseStatus,
  getTeacherPurchaseDetails,
  getStudentContact,
  getStudentContactForPremium,
  createFreeAccessPurchase,
  createOrUpdateTeacherPurchase,
};
