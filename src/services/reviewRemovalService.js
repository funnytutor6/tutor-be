const { executeQuery, generateId } = require("./databaseService");
const reviewAdminService = require("./reviewAdminService");
const logger = require("../utils/logger");

const sourceEnum = ["tutor_review", "public_review"];

/**
 * Request review removal (tutor only)
 */
const requestReviewRemoval = async ({ teacherId, reviewId, reviewSource, reason }) => {
  if (!sourceEnum.includes(reviewSource)) {
    throw new Error("Invalid review source. Must be tutor_review or public_review.");
  }
  if (!reason || !reason.trim()) {
    throw new Error("Reason is required for removal request.");
  }

  const id = await generateId();

  const checkQuery = `
    SELECT id FROM ReviewRemovalRequests
    WHERE reviewId = ? AND review_source = ? AND status = 'pending'
  `;
  const existing = await executeQuery(checkQuery, [reviewId, reviewSource]);
  if (existing.length > 0) {
    throw new Error("A pending removal request already exists for this review.");
  }

  const insertQuery = `
    INSERT INTO ReviewRemovalRequests (id, reviewId, review_source, teacherId, reason)
    VALUES (?, ?, ?, ?, ?)
  `;
  await executeQuery(insertQuery, [id, reviewId, reviewSource, teacherId, reason.trim()]);
  logger.info(`Review removal requested by teacher ${teacherId} for review ${reviewId}`);
  return id;
};

/**
 * Get removal requests for admin (paginated)
 */
const getRemovalRequestsForAdmin = async ({ page = 1, pageSize = 20, status }) => {
  const offset = (page - 1) * pageSize;
  const params = [];
  let whereClause = "";

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    whereClause = "WHERE rrr.status = ?";
    params.push(status);
  }

  const countQuery = `
    SELECT COUNT(*) as total FROM ReviewRemovalRequests rrr ${whereClause}
  `;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0]?.total || 0;

  const dataQuery = `
    SELECT rrr.*, t.name as teacherName, t.email as teacherEmail
    FROM ReviewRemovalRequests rrr
    JOIN Teachers t ON rrr.teacherId = t.id
    ${whereClause}
    ORDER BY rrr.created DESC
    LIMIT ? OFFSET ?
  `;
  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  const enriched = await Promise.all(
    items.map(async (row) => {
      let reviewerName = "";
      let reviewText = "";
      let rating = 0;

      if (row.review_source === "tutor_review") {
        const [r] = await executeQuery(
          `SELECT tr.rating, tr.reviewText, s.name as reviewerName
           FROM TutorReviews tr LEFT JOIN Students s ON tr.studentId = s.id
           WHERE tr.id = ?`,
          [row.reviewId]
        );
        if (r) {
          reviewerName = r.reviewerName || "Student";
          reviewText = r.reviewText;
          rating = r.rating;
        }
      } else {
        const [r] = await executeQuery(
          "SELECT reviewerName, reviewText, rating FROM PublicTutorReviews WHERE id = ?",
          [row.reviewId]
        );
        if (r) {
          reviewerName = r.reviewerName;
          reviewText = r.reviewText;
          rating = r.rating;
        }
      }

      return { ...row, reviewerName, reviewText, rating };
    })
  );

  return {
    items: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

/**
 * Approve removal request - deletes the review and updates request
 */
const approveRemovalRequest = async (requestId) => {
  const [req] = await executeQuery(
    `SELECT rrr.*, t.email as teacherEmail, t.name as teacherName
     FROM ReviewRemovalRequests rrr
     JOIN Teachers t ON rrr.teacherId = t.id
     WHERE rrr.id = ? AND rrr.status = 'pending'`,
    [requestId]
  );
  if (!req) {
    throw new Error("Removal request not found or already processed.");
  }

  await reviewAdminService.deleteReview(req.reviewId, req.review_source);

  await executeQuery(
    "UPDATE ReviewRemovalRequests SET status = 'approved', updated = NOW() WHERE id = ?",
    [requestId]
  );

  logger.info(`Removal request ${requestId} approved by admin, review ${req.reviewId} deleted`);
  return {
    teacherId: req.teacherId,
    teacherEmail: req.teacherEmail,
    teacherName: req.teacherName,
    approved: true,
  };
};

/**
 * Reject removal request
 */
const rejectRemovalRequest = async (requestId, adminNotes) => {
  const [req] = await executeQuery(
    `SELECT rrr.*, t.email as teacherEmail, t.name as teacherName
     FROM ReviewRemovalRequests rrr
     JOIN Teachers t ON rrr.teacherId = t.id
     WHERE rrr.id = ? AND rrr.status = 'pending'`,
    [requestId]
  );
  if (!req) {
    throw new Error("Removal request not found or already processed.");
  }

  await executeQuery(
    "UPDATE ReviewRemovalRequests SET status = 'rejected', adminNotes = ?, updated = NOW() WHERE id = ?",
    [adminNotes || null, requestId]
  );

  logger.info(`Removal request ${requestId} rejected`);
  return {
    teacherId: req.teacherId,
    teacherEmail: req.teacherEmail,
    teacherName: req.teacherName,
    adminNotes: adminNotes || null,
    approved: false,
  };
};

/**
 * Get teacher's own removal requests
 */
const getTeacherRemovalRequests = async (teacherId) => {
  const query = `
    SELECT * FROM ReviewRemovalRequests
    WHERE teacherId = ?
    ORDER BY created DESC
  `;
  return await executeQuery(query, [teacherId]);
};

module.exports = {
  requestReviewRemoval,
  getRemovalRequestsForAdmin,
  approveRemovalRequest,
  rejectRemovalRequest,
  getTeacherRemovalRequests,
};
