const { executeQuery } = require("./databaseService");
const logger = require("../utils/logger");

/**
 * Get paginated teacher posts with search
 * @param {{ page: number, pageSize: number, search?: string }} options
 * @returns {Promise<{ items: Array, total: number, page: number, pageSize: number, totalPages: number }>}
 */
const getPaginatedTeacherPosts = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "WHERE 1 = 1";
  const params = [];

  if (search) {
    const like = `%${search}%`;
    whereClause +=
      " AND (tp.headline LIKE ? OR tp.subject LIKE ? OR t.name LIKE ? OR t.cityOrTown LIKE ?)";
    params.push(like, like, like, like);
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM TeacherPosts tp
    JOIN Teachers t ON tp.teacherId = t.id
    ${whereClause}
  `;

  const [{ total }] = await executeQuery(countQuery, params);

  const dataQuery = `
    SELECT tp.*, 
           t.name AS teacherName, 
           t.email AS teacherEmail, 
           t.phoneNumber, 
           t.cityOrTown, 
           t.country, 
           t.profilePhoto
    FROM TeacherPosts tp
    JOIN Teachers t ON tp.teacherId = t.id
    ${whereClause}
    ORDER BY tp.created DESC
    LIMIT ? OFFSET ?
  `;

  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  logger.info(
    `Fetched ${items.length} teacher posts for admin (page ${page}/${totalPages})`
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
};

/**
 * Get paginated students with search
 * @param {{ page: number, pageSize: number, search?: string }} options
 * @returns {Promise<{ items: Array, total: number, page: number, pageSize: number, totalPages: number }>}
 */
const getPaginatedStudents = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "WHERE 1 = 1";
  const params = [];

  if (search) {
    const like = `%${search}%`;
    whereClause +=
      " AND (s.name LIKE ? OR s.email LIKE ? OR s.phoneNumber LIKE ? OR s.cityOrTown LIKE ? OR s.country LIKE ?)";
    params.push(like, like, like, like, like);
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM Students s
    ${whereClause}
  `;

  const [{ total }] = await executeQuery(countQuery, params);

  const dataQuery = `
    SELECT 
      s.id,
      s.name,
      s.email,
      s.phoneNumber,
      s.cityOrTown,
      s.country,
      s.profilePhoto,
      s.created,
      s.updated
    FROM Students s
    ${whereClause}
    ORDER BY s.created DESC
    LIMIT ? OFFSET ?
  `;

  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  logger.info(
    `Fetched ${items.length} students for admin (page ${page}/${totalPages})`
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
};

/**
 * Get paginated student posts with search
 * @param {{ page: number, pageSize: number, search?: string }} options
 * @returns {Promise<{ items: Array, total: number, page: number, pageSize: number, totalPages: number }>}
 */
const getPaginatedStudentPosts = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "WHERE 1 = 1";
  const params = [];

  if (search) {
    const like = `%${search}%`;
    whereClause +=
      " AND (sp.headline LIKE ? OR sp.subject LIKE ? OR sp.description LIKE ? OR sp.townOrCity LIKE ? OR s.name LIKE ?)";
    params.push(like, like, like, like, like);
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    ${whereClause}
  `;

  const [{ total }] = await executeQuery(countQuery, params);

  const dataQuery = `
    SELECT 
      sp.*,
      s.name AS studentName,
      s.email AS studentEmail,
      s.phoneNumber,
      s.cityOrTown,
      s.country,
      s.profilePhoto
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    ${whereClause}
    ORDER BY sp.created DESC
    LIMIT ? OFFSET ?
  `;

  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  logger.info(
    `Fetched ${items.length} student posts for admin (page ${page}/${totalPages})`
  );

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
};

/**
 * Get teacher post by ID with full teacher details
 * @param {String} postId - Teacher post ID
 * @returns {Promise<Object>} - Teacher post with full teacher details
 */
const getTeacherPostWithDetails = async (postId) => {
  const query = `
    SELECT 
      tp.*,
      t.id AS teacherId,
      t.name AS teacherName,
      t.email AS teacherEmail,
      t.phoneNumber,
      t.cityOrTown,
      t.country,
      t.profilePhoto,
      t.status AS teacherStatus,
      t.created AS teacherCreated,
      t.updated AS teacherUpdated
    FROM TeacherPosts tp
    JOIN Teachers t ON tp.teacherId = t.id
    WHERE tp.id = ?
  `;

  const results = await executeQuery(query, [postId]);

  if (results.length === 0) {
    throw new Error("Tutor post not found");
  }

  const post = results[0];

  // Structure the response
  return {
    post: {
      id: post.id,
      teacherId: post.teacherId,
      headline: post.headline,
      subject: post.subject,
      location: post.location,
      description: post.description,
      lessonType: post.lessonType,
      distanceFromLocation: post.distanceFromLocation,
      townOrDistrict: post.townOrDistrict,
      price: post.price,
      priceType: post.priceType,
      created: post.created,
      updated: post.updated,
    },
    teacher: {
      id: post.teacherId,
      name: post.teacherName,
      email: post.teacherEmail,
      phoneNumber: post.phoneNumber,
      cityOrTown: post.cityOrTown,
      country: post.country,
      profilePhoto: post.profilePhoto,
      status: post.teacherStatus,
      created: post.teacherCreated,
      updated: post.teacherUpdated,
    },
  };
};

/**
 * Get student by ID with premium status and post count
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>} - Student with premium status and post count
 */
const getStudentWithDetails = async (studentId) => {
  const { executeQuery } = require("./databaseService");
  const { getStudentPremiumStatus } = require("./premiumService");
  const { getStudentPostCount } = require("./postService");

  // Get student basic info
  const studentQuery = "SELECT * FROM Students WHERE id = ?";
  const students = await executeQuery(studentQuery, [studentId]);

  if (students.length === 0) {
    throw new Error("Student not found");
  }

  const student = students[0];
  delete student.password;

  // Get premium status
  const premiumStatus = await getStudentPremiumStatus(student.email);

  // Get post count
  const postCount = await getStudentPostCount(studentId);

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phoneNumber: student.phoneNumber,
      cityOrTown: student.cityOrTown,
      country: student.country,
      profilePhoto: student.profilePhoto,
      grade: student.grade,
      created: student.created,
      updated: student.updated,
    },
    premium: {
      hasPremium: premiumStatus.hasPremium,
      isPaid: premiumStatus.isPaid,
      premiumData: premiumStatus.premiumData,
    },
    postCount: postCount,
  };
};

/**
 * Get student post by ID with full student details
 * @param {String} postId - Student post ID
 * @returns {Promise<Object>} - Student post with full student details
 */
const getStudentPostWithDetails = async (postId) => {
  const { executeQuery } = require("./databaseService");
  const { getStudentPremiumStatus } = require("./premiumService");
  const { getStudentPostCount } = require("./postService");

  const query = `
    SELECT 
      sp.*,
      s.id AS studentId,
      s.name AS studentName,
      s.email AS studentEmail,
      s.phoneNumber,
      s.cityOrTown,
      s.country,
      s.profilePhoto,
      s.created AS studentCreated,
      s.updated AS studentUpdated
    FROM StudentPosts sp
    JOIN Students s ON sp.studentId = s.id
    WHERE sp.id = ?
  `;

  const results = await executeQuery(query, [postId]);

  if (results.length === 0) {
    throw new Error("Student post not found");
  }

  const post = results[0];

  // Get premium status
  const premiumStatus = await getStudentPremiumStatus(post.studentEmail);

  // Get total post count for this student
  const postCount = await getStudentPostCount(post.studentId);

  // Structure the response
  return {
    post: {
      id: post.id,
      studentId: post.studentId,
      lessonType: post.lessonType,
      subject: post.subject,
      headline: post.headline,
      description: post.description,
      townOrCity: post.townOrCity,
      created: post.created,
      updated: post.updated,
    },
    student: {
      id: post.studentId,
      name: post.studentName,
      email: post.studentEmail,
      phoneNumber: post.phoneNumber,
      cityOrTown: post.cityOrTown,
      country: post.country,
      profilePhoto: post.profilePhoto,
      created: post.studentCreated,
      updated: post.studentUpdated,
    },
    premium: {
      hasPremium: premiumStatus.hasPremium,
      isPaid: premiumStatus.isPaid,
      premiumData: premiumStatus.premiumData,
    },
    postCount: postCount,
  };
};

module.exports = {
  getPaginatedTeacherPosts,
  getPaginatedStudents,
  getPaginatedStudentPosts,
  getTeacherPostWithDetails,
  getStudentWithDetails,
  getStudentPostWithDetails,
};


