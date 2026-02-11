const { executeQuery, generateId } = require("./databaseService");
const logger = require("../utils/logger");

/**
 * Create a new tutor review
 * @param {Object} reviewData - Review data
 * @returns {Promise<String>} - Created review ID
 */
const createReview = async (reviewData) => {
  const { teacherId, studentId, rating, reviewText } = reviewData;
  const id = await generateId();

  const query = `
    INSERT INTO TutorReviews (id, teacherId, studentId, rating, reviewText)
    VALUES (?, ?, ?, ?, ?)
  `;

  await executeQuery(query, [id, teacherId, studentId, rating, reviewText]);
  logger.info(
    `Review created for teacher ${teacherId} by student ${studentId}`,
  );
  return id;
};

/**
 * Get all reviews for a specific teacher
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Array>} - List of reviews
 */
const getReviewsByTeacherId = async (teacherId) => {
  const query = `
    SELECT tr.*, s.name as studentName, s.profilePhoto as studentPhoto
    FROM TutorReviews tr
    LEFT JOIN Students s ON tr.studentId = s.id
    WHERE tr.teacherId = ?
    ORDER BY tr.created DESC
  `;
  return await executeQuery(query, [teacherId]);
};

/**
 * Get all reviews written by a specific student
 * @param {String} studentId - Student ID
 * @returns {Promise<Array>} - List of reviews
 */
const getReviewsByStudentId = async (studentId) => {
  const query = `
    SELECT tr.*, t.name as teacherName
    FROM TutorReviews tr
    JOIN Teachers t ON tr.teacherId = t.id
    WHERE tr.studentId = ?
    ORDER BY tr.created DESC
  `;
  return await executeQuery(query, [studentId]);
};

/**
 * Get average rating and review count for a teacher
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Object>} - Rating stats
 */
const getTeacherReviewStats = async (teacherId) => {
  const query = `
    SELECT 
      AVG(rating) as averageRating,
      COUNT(*) as reviewCount
    FROM TutorReviews
    WHERE teacherId = ?
  `;
  const results = await executeQuery(query, [teacherId]);
  const stats = results[0] || { averageRating: 0, reviewCount: 0 };

  return {
    averageRating: parseFloat(stats.averageRating) || 0,
    reviewCount: parseInt(stats.reviewCount) || 0,
  };
};

/**
 * Check if a student has already reviewed a teacher
 * @param {String} studentId - Student ID
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Boolean>}
 */
const hasStudentReviewedTeacher = async (studentId, teacherId) => {
  const query = `
    SELECT id FROM TutorReviews
    WHERE studentId = ? AND teacherId = ?
  `;
  const results = await executeQuery(query, [studentId, teacherId]);
  return results.length > 0;
};

module.exports = {
  createReview,
  getReviewsByTeacherId,
  getReviewsByStudentId,
  getTeacherReviewStats,
  hasStudentReviewedTeacher,
};
