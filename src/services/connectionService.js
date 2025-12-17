const { executeQuery, generateId } = require("./databaseService");
const logger = require("../utils/logger");

/**
 * Send connection request
 * @param {Object} requestData - Connection request data
 * @returns {Promise<String>} - Created request ID
 */
const sendConnectionRequest = async (requestData) => {
  const { studentId, teacherId, postId, message } = requestData;

  // Check if request already exists
  const checkQuery =
    "SELECT * FROM ConnectionRequests WHERE studentId = ? AND postId = ?";
  const existing = await executeQuery(checkQuery, [studentId, postId]);

  if (existing.length > 0) {
    throw new Error("Connection request already exists for this post");
  }

  const requestId = await generateId();

  const createQuery = `
    INSERT INTO ConnectionRequests 
    (id, studentId, teacherId, postId, message, status, requestDate, created, updated)
    VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW(), NOW())
  `;

  await executeQuery(createQuery, [
    requestId,
    studentId,
    teacherId,
    postId,
    message || null,
  ]);

  logger.info("Connection request created successfully:", requestId);
  return requestId;
};

/**
 * Get connection requests for teacher
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Array>} - List of connection requests
 */
const getConnectionRequestsForTeacher = async (teacherId) => {
  const query = `
    SELECT cr.*, s.name as studentName, s.email as studentEmail, s.phoneNumber,
           tp.headline as postHeadline, tp.subject as postSubject
    FROM ConnectionRequests cr
    JOIN Students s ON cr.studentId = s.id
    JOIN TeacherPosts tp ON cr.postId = tp.id
    WHERE cr.teacherId = ?
    ORDER BY cr.requestDate DESC
  `;
  return await executeQuery(query, [teacherId]);
};

/**
 * Get connection request count for teacher
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Object>} - Request counts
 */
const getConnectionRequestCount = async (teacherId) => {
  const query = `
    SELECT 
      COUNT(*) as totalRequests,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingRequests,
      SUM(CASE WHEN status = 'purchased' THEN 1 ELSE 0 END) as purchasedRequests
    FROM ConnectionRequests 
    WHERE teacherId = ?
  `;
  const result = await executeQuery(query, [teacherId]);
  return result[0];
};

/**
 * Get specific connection request
 * @param {String} requestId - Request ID
 * @returns {Promise<Object>} - Connection request data
 */
const getConnectionRequestById = async (requestId) => {
  const query = `
    SELECT cr.*, s.name as studentName, s.email as studentEmail, s.phoneNumber,
           tp.headline as postHeadline, tp.subject as postSubject
    FROM ConnectionRequests cr
    JOIN Students s ON cr.studentId = s.id
    JOIN TeacherPosts tp ON cr.postId = tp.id
    WHERE cr.id = ?
  `;
  const requests = await executeQuery(query, [requestId]);

  if (requests.length === 0) {
    throw new Error("Connection request not found");
  }

  return requests[0];
};

/**
 * Purchase connection request (update status to purchased)
 * @param {String} requestId - Request ID
 * @param {String} teacherId - Teacher ID
 * @param {String} stripeSessionId - Stripe session ID
 * @returns {Promise<void>}
 */
const purchaseConnectionRequest = async (
  requestId,
  teacherId,
  stripeSessionId = null
) => {
  const updateQuery = `
    UPDATE ConnectionRequests 
    SET status = 'purchased', paymentStatus = 'paid', contactRevealed = TRUE, purchaseDate = NOW(), stripeSessionId = ?
    WHERE id = ? AND teacherId = ?
  `;

  const result = await executeQuery(updateQuery, [
    stripeSessionId,
    requestId,
    teacherId,
  ]);

  if (result.affectedRows === 0) {
    throw new Error("Connection request not found");
  }

  logger.info("Connection request purchased successfully:", requestId);
};

/**
 * Get request status for student
 * @param {String} postId - Post ID
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>} - Request status
 */
const getRequestStatus = async (postId, studentId) => {
  const query = `
    SELECT cr.*, s.name as studentName, s.email as studentEmail
    FROM ConnectionRequests cr
    JOIN Students s ON cr.studentId = s.id
    WHERE cr.postId = ? AND cr.studentId = ?
  `;
  const requests = await executeQuery(query, [postId, studentId]);

  if (requests.length === 0) {
    return {
      hasRequest: false,
      status: null,
    };
  }

  return {
    hasRequest: true,
    status: requests[0].status,
    requestId: requests[0].id,
    message: requests[0].message,
  };
};

module.exports = {
  sendConnectionRequest,
  getConnectionRequestsForTeacher,
  getConnectionRequestCount,
  getConnectionRequestById,
  purchaseConnectionRequest,
  getRequestStatus,
};
