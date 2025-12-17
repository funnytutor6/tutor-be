const { executeQuery, generateId } = require("./databaseService");
const logger = require("../utils/logger");

/**
 * Get student by ID
 * @param {String} id - Student ID
 * @returns {Promise<Object>} - Student data
 */
const getStudentById = async (id) => {
  const query = "SELECT * FROM Students WHERE id = ?";
  const students = await executeQuery(query, [id]);

  if (students.length === 0) {
    throw new Error("Student not found");
  }

  const student = students[0];
  // Remove password from response
  delete student.password;

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phoneNumber: student.phoneNumber,
    cityOrTown: student.cityOrTown,
    country: student.country,
    profilePhoto: student.profilePhoto,
    created: student.created,
    updated: student.updated,
  };
};

/**
 * Update student profile
 * @param {String} id - Student ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated student data
 */
const updateStudent = async (id, updateData) => {
  const { name, email, phoneNumber, location, country, profilePhoto } =
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

  if (location !== undefined) {
    updateFields.push("cityOrTown = ?");
    updateValues.push(location);
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
    UPDATE Students 
    SET ${updateFields.join(", ")}
    WHERE id = ?
  `;

  const result = await executeQuery(updateQuery, updateValues);

  if (result.affectedRows === 0) {
    throw new Error("Student not found");
  }

  logger.info("Student profile updated successfully:", id);

  return await getStudentById(id);
};

/**
 * Get all students
 * @returns {Promise<Array>} - List of students
 */
const getAllStudents = async () => {
  const query =
    "SELECT id, name, email, phoneNumber, cityOrTown, country, profilePhoto, created, updated FROM Students";
  const students = await executeQuery(query);

  return students;
};

module.exports = {
  getStudentById,
  updateStudent,
  getAllStudents,
};
