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
 * Check if teacher has purchased access to ANY post from a given student
 * @param {String} teacherId - Teacher ID
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>} - Purchase status
 */
const checkPurchaseStatusByStudent = async (teacherId, studentId) => {
  const checkQuery =
    "SELECT * FROM TeacherPurchases WHERE teacherId = ? AND studentId = ? AND paymentStatus = 'paid' LIMIT 1";
  const existing = await executeQuery(checkQuery, [teacherId, studentId]);

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
    throw new Error("Tutor purchase not found or not paid");
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
  // First try exact post match
  const purchaseQuery = `
    SELECT tp.*, s.name, s.email, s.phoneNumber, sp.subject, sp.headline
    FROM TeacherPurchases tp
    JOIN Students s ON tp.studentId = s.id
    JOIN StudentPosts sp ON tp.studentPostId = sp.id
    WHERE tp.studentPostId = ? AND tp.teacherId = ? AND tp.paymentStatus = 'paid'
  `;
  const purchases = await executeQuery(purchaseQuery, [postId, teacherId]);

  if (purchases.length > 0) {
    const purchase = purchases[0];
    return {
      name: purchase.name,
      email: purchase.email,
      phoneNumber: purchase.phoneNumber,
      subject: purchase.subject,
      headline: purchase.headline,
    };
  }

  // Fallback: check if teacher purchased ANY post from the same student
  const crossPostQuery = `
    SELECT s.name, s.email, s.phoneNumber, sp.subject, sp.headline
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    WHERE sp.id = ?
      AND EXISTS (
        SELECT 1 FROM TeacherPurchases tp2
        WHERE tp2.teacherId = ? AND tp2.studentId = s.id AND tp2.paymentStatus = 'paid'
      )
  `;
  const crossResults = await executeQuery(crossPostQuery, [postId, teacherId]);

  if (crossResults.length === 0) {
    throw new Error("Contact access not purchased or not found");
  }

  return {
    name: crossResults[0].name,
    email: crossResults[0].email,
    phoneNumber: crossResults[0].phoneNumber,
    subject: crossResults[0].subject,
    headline: crossResults[0].headline,
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

/**
 * Get combined purchase history for a teacher (TeacherPurchases + ConnectionRequests)
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Array>} - Unified list of all contact unlocks
 */
const getTeacherPurchaseHistory = async (teacherId) => {
  const query = `
    (
      SELECT 
        tp.id, 
        'post_purchase' as type,
        s.name as studentName,
        s.email as studentEmail,
        s.phoneNumber as studentPhone,
        sp.subject,
        sp.headline,
        tp.paymentAmount as amount,
        tp.paymentStatus,
        tp.purchasedAt as purchaseDate,
        tp.stripeSessionId
      FROM TeacherPurchases tp
      JOIN Students s ON tp.studentId = s.id
      JOIN StudentPosts sp ON tp.studentPostId = sp.id
      WHERE tp.teacherId = ? AND tp.paymentStatus = 'paid'
    )
    UNION ALL
    (
      SELECT 
        cr.id,
        'connection_request' as type,
        s.name as studentName,
        s.email as studentEmail,
        s.phoneNumber as studentPhone,
        tp2.subject,
        tp2.headline,
        cr.paymentAmount as amount,
        cr.paymentStatus,
        cr.purchaseDate as purchaseDate,
        cr.stripeSessionId
      FROM ConnectionRequests cr
      JOIN Students s ON cr.studentId = s.id
      JOIN TeacherPosts tp2 ON cr.postId = tp2.id
      WHERE cr.teacherId = ? AND cr.status = 'purchased'
    )
    ORDER BY purchaseDate DESC
  `;
  return await executeQuery(query, [teacherId, teacherId]);
};

/**
 * Get all contact purchases for admin (paginated)
 * @param {Object} options - { page, pageSize, search }
 * @returns {Promise<Object>} - { purchases, total, page, pageSize }
 */
const getAllContactPurchasesForAdmin = async ({ page = 1, pageSize = 20, search = "" }) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "";
  const params = [];

  if (search) {
    whereClause = `WHERE t.name LIKE ? OR t.email LIKE ? OR s.name LIKE ? OR s.email LIKE ? OR sp.subject LIKE ?`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const countQuery = `
    SELECT COUNT(*) as total
    FROM TeacherPurchases tp
    JOIN Teachers t ON tp.teacherId = t.id
    JOIN Students s ON tp.studentId = s.id
    JOIN StudentPosts sp ON tp.studentPostId = sp.id
    ${whereClause}
  `;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0].total;

  const dataQuery = `
    SELECT 
      tp.id,
      t.name as teacherName,
      t.email as teacherEmail,
      s.name as studentName,
      s.email as studentEmail,
      sp.subject as postSubject,
      sp.headline as postHeadline,
      tp.paymentAmount as amount,
      tp.paymentStatus,
      tp.purchasedAt as purchaseDate,
      tp.stripeSessionId
    FROM TeacherPurchases tp
    JOIN Teachers t ON tp.teacherId = t.id
    JOIN Students s ON tp.studentId = s.id
    JOIN StudentPosts sp ON tp.studentPostId = sp.id
    ${whereClause}
    ORDER BY tp.purchasedAt DESC
    LIMIT ? OFFSET ?
  `;
  const purchases = await executeQuery(dataQuery, [...params, pageSize, offset]);

  return { purchases, total, page, pageSize };
};

module.exports = {
  getTeacherPurchases,
  checkPurchaseStatus,
  checkPurchaseStatusByStudent,
  getTeacherPurchaseDetails,
  getStudentContact,
  getStudentContactForPremium,
  createFreeAccessPurchase,
  createOrUpdateTeacherPurchase,
  getTeacherPurchaseHistory,
  getAllContactPurchasesForAdmin,
};
