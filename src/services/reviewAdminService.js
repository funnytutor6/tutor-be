const { executeQuery } = require("./databaseService");
const logger = require("../utils/logger");

/**
 * Get all reviews for admin (paginated, union of TutorReviews + PublicTutorReviews)
 */
const getAllReviewsForAdmin = async ({ page = 1, pageSize = 20, search = "" }) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "";
  const params = [];
  if (search) {
    whereClause = `WHERE teacherName LIKE ? OR reviewerName LIKE ? OR reviewText LIKE ?`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const baseQuery = `
    SELECT id, teacherId, teacherName, reviewerName, rating, reviewText, created, reviewSource
    FROM (
      SELECT tr.id, tr.teacherId, t.name as teacherName, s.name as reviewerName,
        tr.rating, tr.reviewText, tr.created, 'tutor_review' as reviewSource
      FROM TutorReviews tr
      JOIN Teachers t ON tr.teacherId = t.id
      LEFT JOIN Students s ON tr.studentId = s.id
      UNION ALL
      SELECT ptr.id, ptr.teacherId, t.name as teacherName, ptr.reviewerName,
        ptr.rating, ptr.reviewText, ptr.created, 'public_review' as reviewSource
      FROM PublicTutorReviews ptr
      JOIN Teachers t ON ptr.teacherId = t.id
    ) all_reviews
    ${whereClause}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) counted`;
  const countResult = await executeQuery(countQuery, params);
  const total = countResult[0]?.total || 0;

  const dataQuery = `${baseQuery} ORDER BY created DESC LIMIT ? OFFSET ?`;
  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

/**
 * Delete a review (admin only)
 * @param {string} reviewId - Review ID
 * @param {string} source - 'tutor_review' or 'public_review'
 */
const deleteReview = async (reviewId, source) => {
  if (source === "tutor_review") {
    const query = "DELETE FROM TutorReviews WHERE id = ?";
    await executeQuery(query, [reviewId]);
    logger.info(`Admin deleted TutorReview ${reviewId}`);
  } else if (source === "public_review") {
    const query = "DELETE FROM PublicTutorReviews WHERE id = ?";
    await executeQuery(query, [reviewId]);
    logger.info(`Admin deleted PublicTutorReview ${reviewId}`);
  } else {
    throw new Error("Invalid review source");
  }
  return true;
};

module.exports = {
  getAllReviewsForAdmin,
  deleteReview,
};
