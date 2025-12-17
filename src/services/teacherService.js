const { executeQuery, generateId } = require("./databaseService");
const { pool } = require("../config/database");
const logger = require("../utils/logger");

/**
 * Get teacher by ID
 * @param {String} id - Teacher ID
 * @returns {Promise<Object>} - Teacher data
 */
const getTeacherById = async (id) => {
  const query = "SELECT * FROM Teachers WHERE id = ?";
  const teachers = await executeQuery(query, [id]);

  if (teachers.length === 0) {
    throw new Error("Teacher not found");
  }

  const teacher = teachers[0];
  // Remove password from response
  delete teacher.password;

  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    phoneNumber: teacher.phoneNumber,
    cityOrTown: teacher.cityOrTown,
    country: teacher.country,
    profilePhoto: teacher.profilePhoto,
    status: teacher.status || "pending",
    created: teacher.created,
    updated: teacher.updated,
  };
};

/**
 * Update teacher profile
 * @param {String} id - Teacher ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated teacher data
 */
const updateTeacher = async (id, updateData) => {
  const { name, email, phoneNumber, cityOrTown, country, profilePhoto } =
    updateData;

  // Build update query dynamically
  const updateFields = [];
  const updateValues = [];

  if (name !== undefined) {
    updateFields.push("name = ?");
    updateValues.push(name);
  }
  if (email !== undefined) {
    updateFields.push("email = ?");
    updateValues.push(email);
  }
  if (phoneNumber !== undefined) {
    updateFields.push("phoneNumber = ?");
    updateValues.push(phoneNumber);
  }
  if (cityOrTown !== undefined) {
    updateFields.push("cityOrTown = ?");
    updateValues.push(cityOrTown);
  }
  if (country !== undefined) {
    updateFields.push("country = ?");
    updateValues.push(country);
  }
  if (profilePhoto !== undefined) {
    updateFields.push("profilePhoto = ?");
    updateValues.push(profilePhoto);
  }

  if (updateFields.length === 0) {
    throw new Error("No fields to update");
  }

  updateFields.push("updated = NOW()");
  updateValues.push(id);

  const updateQuery = `
    UPDATE Teachers 
    SET ${updateFields.join(", ")}
    WHERE id = ?
  `;

  const result = await executeQuery(updateQuery, updateValues);

  if (result.affectedRows === 0) {
    throw new Error("Teacher not found");
  }

  logger.info("Teacher profile updated successfully:", id);

  return await getTeacherById(id);
};

/**
 * Get all teachers
 * @returns {Promise<Array>} - List of teachers
 */
const getAllTeachers = async () => {
  const query =
    "SELECT id, name, email, phoneNumber, cityOrTown, country, profilePhoto, status, created, updated FROM Teachers";
  const teachers = await executeQuery(query);

  return teachers.map((teacher) => ({
    ...teacher,
    status: teacher.status || "pending",
  }));
};

// get all public teachers
const getAllPublicTeachers = async () => {
  const query =
    "SELECT id, name, email, phoneNumber, cityOrTown, country, profilePhoto, status, created, updated FROM Teachers WHERE status = 'approved'";
  const teachers = await executeQuery(query);
  return teachers.map((teacher) => ({
    ...teacher,
    status: teacher.status || "pending",
  }));
};

/**
 * Get public teacher by ID
 * @param {String} id - Teacher ID
 * @returns {Promise<Object>} - Teacher data
 */
const getPublicTeacherById = async (id, userId) => {
  const query = "SELECT * FROM Teachers WHERE id = ? AND status = 'approved'";
  const teachers = await executeQuery(query, [id]);

  if (teachers.length === 0) {
    throw new Error("Teacher not found");
  }
  const studentQuery = "SELECT * FROM Students WHERE id = ? AND hasPremium = 1";
  const hasStudents = (await executeQuery(studentQuery, [userId])?.length) > 0;
  const teacher = teachers[0];
  if (hasStudents) {
    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phoneNumber: teacher.phoneNumber,
      cityOrTown: teacher.cityOrTown,
      country: teacher.country,
      profilePhoto: teacher.profilePhoto,
    };
  }

  // Remove password from response
  delete teacher.password;

  return {
    id: teacher.id,
    name: teacher.name,
    cityOrTown: teacher.cityOrTown,
    country: teacher.country,
  };
};

/**
 * Delete teacher account and all related data
 * @param {String} id - Teacher ID
 * @returns {Promise<void>}
 */
const deleteTeacher = async (id) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if teacher exists and get email for premium deletion
    const teacherQuery = "SELECT id, email FROM Teachers WHERE id = ?";
    const [teachers] = await connection.query(teacherQuery, [id]);

    if (teachers.length === 0) {
      throw new Error("Teacher not found");
    }

    const teacherEmail = teachers[0].email;

    // Delete teacher posts
    const deletePostsQuery = "DELETE FROM TeacherPosts WHERE teacherId = ?";
    await connection.query(deletePostsQuery, [id]);
    logger.info("Deleted teacher posts for teacher:", id);

    // Delete connection requests
    const deleteConnectionRequestsQuery =
      "DELETE FROM ConnectionRequests WHERE teacherId = ?";
    await connection.query(deleteConnectionRequestsQuery, [id]);
    logger.info("Deleted connection requests for teacher:", id);

    // Delete teacher purchases
    const deletePurchasesQuery =
      "DELETE FROM TeacherPurchases WHERE teacherId = ?";
    await connection.query(deletePurchasesQuery, [id]);
    logger.info("Deleted teacher purchases for teacher:", id);

    // Delete premium subscription (if exists in database)
    const deletePremiumQuery =
      "DELETE FROM findtutor_premium_teachers WHERE mail = ?";
    await connection.query(deletePremiumQuery, [teacherEmail]);
    logger.info("Deleted premium subscription for teacher:", id);

    // Finally, delete the teacher
    const deleteTeacherQuery = "DELETE FROM Teachers WHERE id = ?";
    const [result] = await connection.query(deleteTeacherQuery, [id]);

    if (result.affectedRows === 0) {
      throw new Error("Teacher not found");
    }

    await connection.commit();
    logger.info("Teacher account deleted successfully:", id);
  } catch (error) {
    await connection.rollback();
    logger.error("Error deleting teacher account:", error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getTeacherById,
  updateTeacher,
  getAllTeachers,
  getAllPublicTeachers,
  getPublicTeacherById,
  deleteTeacher,
};
