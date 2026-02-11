const { executeQuery, generateId } = require("./databaseService");
const logger = require("../utils/logger");
const { getTeacherPremiumStatus } = require("./premiumService");
const { getStudentById } = require("./studentService");

/**
 * Get all student posts
 * @returns {Promise<Array>} - List of student posts with student info
 */
const getAllStudentPosts = async (studentId) => {
  const query = `
    SELECT sp.*, s.name as studentName, s.email as studentEmail, s.phoneNumber, s.cityOrTown, s.country, s.profilePhoto
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    WHERE sp.studentId = ?
    ORDER BY sp.created DESC
  `;
  return await executeQuery(query, [studentId]);
};

/**
 * Create a new student post
 * @param {Object} postData - Post data
 * @returns {Promise<String>} - Created post ID
 */
const createStudentPost = async (postData) => {
  const {
    studentId,
    lessonType,
    subject,
    headline,
    description,
    townOrCity,
    grade,
  } = postData;

  const postId = await generateId();

  const createQuery = `
    INSERT INTO StudentPosts 
    (id, studentId, lessonType, subject, headline, description, townOrCity, grade, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  await executeQuery(createQuery, [
    postId,
    studentId,
    lessonType,
    subject,
    headline,
    description || null,
    townOrCity || null,
    grade || "student",
  ]);

  logger.info("Student post created successfully:", postId);
  return postId;
};

/**
 * Update a student post
 * @param {String} id - Post ID
 * @param {Object} updateData - Update data
 * @returns {Promise<void>}
 */
const updateStudentPost = async (id, updateData) => {
  const {
    studentId,
    lessonType,
    subject,
    headline,
    description,
    townOrCity,
    grade,
  } = updateData;

  const updateQuery = `
    UPDATE StudentPosts 
    SET studentId = ?, lessonType = ?, subject = ?, headline = ?, 
        description = ?, townOrCity = ?, grade = ?, updated = NOW()
    WHERE id = ?
  `;

  const result = await executeQuery(updateQuery, [
    studentId,
    lessonType,
    subject,
    headline,
    description || null,
    townOrCity || null,
    grade || "student",
    id,
  ]);

  if (result.affectedRows === 0) {
    throw new Error("Post not found");
  }

  logger.info("Student post updated successfully:", id);
};

/**
 * Delete a student post
 * @param {String} id - Post ID
 * @returns {Promise<void>}
 */
const deleteStudentPost = async (id) => {
  const deleteQuery = "DELETE FROM StudentPosts WHERE id = ?";
  const result = await executeQuery(deleteQuery, [id]);

  if (result.affectedRows === 0) {
    throw new Error("Post not found");
  }

  logger.info("Student post deleted successfully:", id);
};

/**
 * Get all teacher posts
 * @returns {Promise<Array>} - List of teacher posts with teacher info
 */
const getAllTeacherPosts = async (teacherId) => {
  const query = `
    SELECT 
      tp.*, 
      t.name as teacherName, 
      t.email as teacherEmail, 
      t.phoneNumber, 
      t.cityOrTown, 
      t.country, 
      t.profilePhoto,
      COALESCE(avg_rating.averageRating, 0) as averageRating,
      COALESCE(avg_rating.reviewCount, 0) as reviewCount
    FROM TeacherPosts tp
    JOIN Teachers t ON tp.teacherId = t.id
    LEFT JOIN (
      SELECT teacherId, AVG(rating) as averageRating, COUNT(*) as reviewCount
      FROM TutorReviews
      GROUP BY teacherId
    ) avg_rating ON t.id = avg_rating.teacherId
    WHERE tp.teacherId = ?
    ORDER BY tp.created DESC
  `;
  return await executeQuery(query, [teacherId]);
};

/**
 * Get teacher posts by teacher ID
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Array>} - List of teacher posts
 */
const getTeacherPostsByTeacherId = async (teacherId) => {
  const query = `
    SELECT 
      tp.*, 
      t.name as teacherName, 
      t.email as teacherEmail, 
      t.phoneNumber, 
      t.cityOrTown, 
      t.country, 
      t.profilePhoto,
      COALESCE(avg_rating.averageRating, 0) as averageRating,
      COALESCE(avg_rating.reviewCount, 0) as reviewCount
    FROM TeacherPosts tp
    JOIN Teachers t ON tp.teacherId = t.id
    LEFT JOIN (
      SELECT teacherId, AVG(rating) as averageRating, COUNT(*) as reviewCount
      FROM TutorReviews
      GROUP BY teacherId
    ) avg_rating ON t.id = avg_rating.teacherId
    WHERE tp.teacherId = ?
    ORDER BY tp.created DESC
  `;
  return await executeQuery(query, [teacherId]);
};

/**
 * Create a new teacher post
 * @param {Object} postData - Post data
 * @returns {Promise<String>} - Created post ID
 */
const createTeacherPost = async (postData) => {
  const {
    teacherId,
    headline,
    subject,
    location,
    description,
    lessonType,
    distanceFromLocation,
    townOrDistrict,
    price,
    priceType,
  } = postData;

  const postId = await generateId();

  const createQuery = `
    INSERT INTO TeacherPosts 
    (id, teacherId, headline, subject, location, description, lessonType, distanceFromLocation, townOrDistrict, price, priceType, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  // Normalize priceType: map 'lesson' to 'hourly' for database compatibility
  const normalizedPriceType =
    priceType === "lesson" ? "hourly" : priceType || "hourly";

  // Validate priceType against database ENUM values
  const validPriceTypes = ["hourly", "daily", "weekly", "monthly"];
  if (!validPriceTypes.includes(normalizedPriceType)) {
    throw new Error(
      `Invalid priceType: ${normalizedPriceType}. Must be one of: ${validPriceTypes.join(
        ", ",
      )}`,
    );
  }

  await executeQuery(createQuery, [
    postId,
    teacherId,
    headline,
    subject || null,
    location || null,
    description || null,
    lessonType || "in-person",
    distanceFromLocation || 5,
    townOrDistrict || null,
    price,
    normalizedPriceType,
  ]);

  logger.info("Teacher post created successfully:", postId);
  return postId;
};

/**
 * Update a teacher post
 * @param {String} id - Post ID
 * @param {Object} updateData - Update data
 * @returns {Promise<void>}
 */
const updateTeacherPost = async (id, updateData) => {
  const {
    teacherId,
    headline,
    subject,
    location,
    description,
    lessonType,
    distanceFromLocation,
    townOrDistrict,
    price,
    priceType,
  } = updateData;

  const updateQuery = `
    UPDATE TeacherPosts 
    SET teacherId = ?, headline = ?, subject = ?, location = ?, description = ?, 
        lessonType = ?, distanceFromLocation = ?, townOrDistrict = ?, price = ?, 
        priceType = ?, updated = NOW()
    WHERE id = ?
  `;

  // Normalize priceType: map 'lesson' to 'hourly' for database compatibility
  const normalizedPriceType =
    priceType === "lesson" ? "hourly" : priceType || "hourly";

  // Validate priceType against database ENUM values
  const validPriceTypes = ["hourly", "daily", "weekly", "monthly"];
  if (!validPriceTypes.includes(normalizedPriceType)) {
    throw new Error(
      `Invalid priceType: ${normalizedPriceType}. Must be one of: ${validPriceTypes.join(
        ", ",
      )}`,
    );
  }

  const result = await executeQuery(updateQuery, [
    teacherId,
    headline,
    subject,
    location || null,
    description || null,
    lessonType || "in-person",
    distanceFromLocation || 5,
    townOrDistrict || null,
    price,
    normalizedPriceType,
    id,
  ]);

  if (result.affectedRows === 0) {
    throw new Error("Post not found");
  }

  logger.info("Teacher post updated successfully:", id);
};

/**
 * Get teacher post count by teacher ID
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Number>} - Post count
 */
const getTeacherPostCount = async (teacherId) => {
  const query = "SELECT COUNT(*) FROM TeacherPosts WHERE teacherId = ?";
  const result = await executeQuery(query, [teacherId]);
  return result[0]["COUNT(*)"];
};

/**
 * Delete a teacher post
 * @param {String} id - Post ID
 * @returns {Promise<void>}
 */
const deleteTeacherPost = async (id) => {
  const deleteQuery = "DELETE FROM TeacherPosts WHERE id = ?";
  const result = await executeQuery(deleteQuery, [id]);

  if (result.affectedRows === 0) {
    throw new Error("Post not found");
  }

  logger.info("Teacher post deleted successfully:", id);
};

/**
 * Get student post by ID
 * @param {String} id - Post ID
 * @returns {Promise<Object>} - Post data
 */
const getStudentPostById = async (studentId) => {
  const query = `
    SELECT sp.*, s.name as studentName, s.email as studentEmail, s.phoneNumber, s.cityOrTown, s.country, s.profilePhoto
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    WHERE sp.studentId = ?
  `;
  const posts = await executeQuery(query, [studentId]);

  return posts;
};

/**
 * Get student post count by student ID
 * @param {String} studentId - Student ID
 * @returns {Promise<Number>} - Post count
 */
const getStudentPostCount = async (studentId) => {
  const query = "SELECT COUNT(*) FROM StudentPosts WHERE studentId = ?";
  const result = await executeQuery(query, [studentId]);
  return result[0]["COUNT(*)"];
};

/**
 * Get all public teacher posts
 * @param {String} userId - Optional user ID (student ID) to check connection requests
 * @returns {Promise<Array>} - List of teacher posts with teacher info and connection request status
 */
const getAllPublicTeacherPosts = async (userId) => {
  // Check if user is a student (premium or not)
  let isStudent = false;
  let hasPremium = false;

  if (userId) {
    const studentQuery = "SELECT id, hasPremium FROM Students WHERE id = ?";
    const studentResult = await executeQuery(studentQuery, [userId]);
    if (studentResult.length > 0) {
      isStudent = true;
      hasPremium = studentResult[0].hasPremium === 1;
    }
  }

  // Build query
  let query = `
    SELECT 
      tp.id, 
      tp.headline, 
      tp.subject, 
      tp.location, 
      tp.description, 
      tp.lessonType, 
      tp.distanceFromLocation, 
      tp.townOrDistrict, 
      tp.price, 
      tp.priceType, 
      t.id as teacherId, 
      t.name as teacherName, 
      t.cityOrTown, 
      t.country,
      COALESCE(avg_rating.averageRating, 0) as averageRating,
      COALESCE(avg_rating.reviewCount, 0) as reviewCount`;

  // Add student info if premium
  if (hasPremium) {
    query += `, 
      s.id as studentId, 
      s.name as studentName, 
      s.email as studentEmail, 
      s.phoneNumber, 
      s.cityOrTown as studentCityOrTown, 
      s.country as studentCountry, 
      t.profilePhoto,
      t.email`;
  }

  // Add connection request info if user is a student
  if (isStudent) {
    query += `,
      CASE WHEN cr.id IS NOT NULL THEN 1 ELSE 0 END as hasRequested,
      cr.status as requestStatus,
      cr.id as requestId,
      cr.message as requestMessage,
      cr.requestDate,
      cr.purchaseDate,
      cr.paymentStatus`;
  }

  query += `
    FROM TeacherPosts tp
    JOIN Teachers t ON tp.teacherId = t.id
    LEFT JOIN (
      SELECT teacherId, AVG(rating) as averageRating, COUNT(*) as reviewCount
      FROM TutorReviews
      GROUP BY teacherId
    ) avg_rating ON t.id = avg_rating.teacherId`;

  // LEFT JOIN with Students if premium
  if (hasPremium) {
    query += `
    LEFT JOIN Students s ON s.id = ?`;
  }

  // LEFT JOIN with ConnectionRequests if student
  if (isStudent) {
    query += `
    LEFT JOIN ConnectionRequests cr ON cr.postId = tp.id AND cr.studentId = ?`;
  }

  query += `
    WHERE tp.archived = 0
    ORDER BY tp.created DESC`;

  // Build parameters array
  const params = [];
  if (hasPremium) {
    params.push(userId);
  }
  if (isStudent) {
    params.push(userId);
  }

  const posts = await executeQuery(query, params);

  // Transform the results
  return posts.map((post) => {
    const transformedPost = { ...post };

    // Ensure boolean values are properly set for connection requests
    if (isStudent) {
      transformedPost.hasRequested =
        post.hasRequested === 1 || post.hasRequested === true;
    }

    // Ensure numeric types for ratings
    transformedPost.averageRating = parseFloat(post.averageRating) || 0;
    transformedPost.reviewCount = parseInt(post.reviewCount) || 0;

    return transformedPost;
  });
};

/**
 * Get all student public posts
 * @returns {Promise<Array>} - List of student posts with student info
 */
const getAllStudentPublicPosts = async (teacherEmail) => {
  // check if have user in db
  const studentQuery =
    "SELECT * FROM findtutor_premium_teachers WHERE mail = ?";
  const studentData = await executeQuery(studentQuery, [teacherEmail]);
  const hasStudents = studentData?.length > 0 && studentData[0].ispaid === 1;
  const query = `
    SELECT sp.*, s.name as studentName, s.cityOrTown, s.country ${
      hasStudents
        ? ", s.id as studentId, s.name as studentName, s.email as studentEmail, s.phoneNumber, s.cityOrTown, s.country, s.profilePhoto"
        : ""
    }
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    WHERE sp.archived = 0
    ORDER BY sp.created DESC
  `;
  const posts = await executeQuery(query, []);
  return posts;
};

/**
 * Get all public teacher posts by ID
 * @param {String} id - Post ID
 * @returns {Promise<Array>} - List of teacher posts with teacher info
 */
const getAllPublicTeacherPostsById = async (id, userId) => {
  // check if have user in db
  const studentQuery = "SELECT * FROM Students WHERE id = ? AND hasPremium = 1";
  const studentResult = await executeQuery(studentQuery, [userId]);
  const hasStudents = studentResult?.length > 0;

  const query = `
    SELECT 
      tp.*, t.name as teacherName, t.cityOrTown, t.country, t.email, t.about,
      COALESCE(avg_rating.averageRating, 0) as averageRating,
      COALESCE(avg_rating.reviewCount, 0) as reviewCount
      ${
        hasStudents
          ? ", t.name, t.phoneNumber, t.cityOrTown, t.country, t.profilePhoto"
          : ""
      } FROM TeacherPosts tp
    JOIN Teachers t ON tp.teacherId = t.id
    LEFT JOIN (
      SELECT teacherId, AVG(rating) as averageRating, COUNT(*) as reviewCount
      FROM TutorReviews
      GROUP BY teacherId
    ) avg_rating ON t.id = avg_rating.teacherId
    WHERE tp.id = ? AND tp.archived = 0
    ORDER BY tp.created DESC
  `;
  const posts = await executeQuery(query, [id]);

  const post = posts[0] || null;
  const email = post?.email || null;
  if (!hasStudents && post) {
    post.email = null;
  }

  const premiumStatus = await getTeacherPremiumStatus(email);

  if (premiumStatus.hasPremium) {
    post.videoLinks = {
      link1: premiumStatus?.premiumData?.link1 || null,
      link2: premiumStatus?.premiumData?.link2 || null,
      link3: premiumStatus?.premiumData?.link3 || null,
    };
  }
  return post;
};
module.exports = {
  getAllStudentPosts,
  createStudentPost,
  updateStudentPost,
  deleteStudentPost,
  getAllTeacherPosts,
  getTeacherPostsByTeacherId,
  createTeacherPost,
  updateTeacherPost,
  deleteTeacherPost,
  getStudentPostById,
  getStudentPostCount,
  getAllPublicTeacherPosts,
  getAllStudentPublicPosts,
  getAllPublicTeacherPostsById,
};
