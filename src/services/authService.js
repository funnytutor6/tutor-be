const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { executeQuery, generateId } = require("./databaseService");
const jwtConfig = require("../config/jwt");
const logger = require("../utils/logger");
const {
  getStudentPremiumStatus,
  getTeacherPremiumStatus,
} = require("./premiumService");

/**
 * Hash password using bcrypt
 * @param {String} password - Plain text password
 * @returns {Promise<String>} - Hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Promise<Boolean>} - True if passwords match
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload (id, email, role)
 * @returns {String} - JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, jwtConfig.secret, {
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
};

/**
 * Register a teacher
 * @param {Object} teacherData - Teacher registration data
 * @returns {Promise<Object>} - Created teacher data
 */
const registerTeacher = async (teacherData) => {
  const {
    name,
    email,
    password,
    phoneNumber,
    cityOrTown,
    country,
    profilePhotoUrl,
  } = teacherData;

  // Check if teacher already exists
  const checkQuery = "SELECT * FROM Teachers WHERE email = ?";
  const existing = await executeQuery(checkQuery, [email]);

  if (existing.length > 0) {
    throw new Error("Tutor with this email already exists");
  }

  // Generate new teacher ID
  const teacherId = await generateId();

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create teacher record with pending status
  const createQuery = `
    INSERT INTO Teachers 
    (id, name, email, password, phoneNumber, cityOrTown, country, profilePhoto, about, status, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
  `;

  const defaultAbout = 'I am a passionate educator dedicated to helping students achieve their learning goals.';

  await executeQuery(createQuery, [
    teacherId,
    name,
    email,
    hashedPassword,
    phoneNumber || null,
    cityOrTown || null,
    country || null,
    profilePhotoUrl || null,
    defaultAbout,
    "pending",
  ]);

  logger.info("Teacher registered successfully:", teacherId);

  // Send welcome email to teacher (don't wait for it, don't fail if it errors)
  const emailService = require("./emailService");
  emailService.sendTeacherWelcomeEmail({ email, name }).catch((error) => {
    logger.error("Failed to send teacher welcome email:", error);
    // Continue registration even if email fails
  });

  // Send notification to admin (don't wait for it, don't fail if it errors)
  emailService
    .sendTeacherRegistrationNotificationToAdmin({
      name,
      email,
      phoneNumber: phoneNumber || null,
      cityOrTown: cityOrTown || null,
      country: country || null,
    })
    .catch((error) => {
      logger.error("Failed to send admin notification:", error);
      // Continue registration even if email fails
    });

  return {
    teacherId,
    teacher: {
      id: teacherId,
      name,
      email,
      phoneNumber: phoneNumber || null,
      cityOrTown: cityOrTown || null,
      country: country || null,
      profilePhoto: profilePhotoUrl || null,
      status: "pending",
    },
  };
};

/**
 * Complete teacher registration after OTP verification
 * @param {String} teacherId - Teacher ID
 * @returns {Promise<Object>} - Teacher data with token
 */
const completeTeacherRegistration = async (teacherId) => {
  // Get teacher data
  const query = "SELECT * FROM Teachers WHERE id = ?";
  const teachers = await executeQuery(query, [teacherId]);

  if (teachers.length === 0) {
    throw new Error("Tutor not found");
  }

  const teacher = teachers[0];

  // Verify phone number is verified via OTP
  const otpService = require("./otpService");
  const isVerified = await otpService.isPhoneVerified(
    teacherId,
    "teacher",
    teacher.phoneNumber
  );

  if (!isVerified) {
    throw new Error(
      "Phone number must be verified before completing registration"
    );
  }

  logger.info("Teacher registration completed:", teacherId);

  // Generate JWT token
  const token = generateToken({
    id: teacher.id,
    email: teacher.email,
    role: "teacher",
  });

  // Get teacher premium status
  const premiumStatus = await getTeacherPremiumStatus(teacher.email);

  return {
    token,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phoneNumber: teacher.phoneNumber,
      cityOrTown: teacher.cityOrTown,
      country: teacher.country,
      profilePhoto: teacher.profilePhoto,
      about: teacher.about,
      status: teacher.status || "pending",
      created: teacher.created,
      updated: teacher.updated,
      hasPremium: premiumStatus?.hasPremium || false,
    },
  };
};

/**
 * Login a teacher
 * @param {String} email - Teacher email
 * @param {String} password - Plain text password
 * @returns {Promise<Object>} - Teacher data and token
 */
const loginTeacher = async (email, password) => {
  // Find teacher by email
  const query = "SELECT * FROM Teachers WHERE email = ?";
  const teachers = await executeQuery(query, [email]);

  if (teachers.length === 0) {
    throw new Error("Invalid email or password");
  }

  const teacher = teachers[0];

  // Check password
  const isPasswordValid = await comparePassword(password, teacher.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }
  if (teacher.status === "rejected") {
    throw new Error("Your account is rejected. Please contact support.");
  }

  // Check if phone number is verified (block login until OTP verified)
  if (teacher.phoneNumber) {
    const otpService = require("./otpService");
    const isPhoneVerified = await otpService.isPhoneVerified(
      teacher.id,
      "teacher",
      teacher.phoneNumber
    );

    if (!isPhoneVerified) {
      // Throw error with user data for frontend to show OTP verification
      const error = new Error(
        "Please verify your phone number with OTP before logging in. Check your WhatsApp for the verification code."
      );
      error.requiresOTPVerification = true;
      error.userId = teacher.id;
      error.phoneNumber = teacher.phoneNumber;
      error.userType = "teacher";
      throw error;
    }
  }

  logger.info("Teacher logged in successfully:", teacher.id);

  // Generate JWT token
  const token = generateToken({
    id: teacher.id,
    email: teacher.email,
    role: "teacher",
  });

  // Get teacher premium status
  const premiumStatus = await getTeacherPremiumStatus(teacher.email);

  return {
    token,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phoneNumber: teacher.phoneNumber,
      cityOrTown: teacher.cityOrTown,
      country: teacher.country,
      profilePhoto: teacher.profilePhoto,
      about: teacher.about,
      status: teacher.status || "pending",
      created: teacher.created,
      updated: teacher.updated,
      hasPremium: premiumStatus?.hasPremium || false,
    },
  };
};

/**
 * Register a student
 * @param {Object} studentData - Student registration data
 * @returns {Promise<Object>} - Created student data
 */
const registerStudent = async (studentData) => {
  const {
    name,
    email,
    password,
    phoneNumber,
    cityOrTown,
    country,
    profilePhotoUrl,
  } = studentData;

  // Check if student already exists
  const checkQuery = "SELECT * FROM Students WHERE email = ?";
  const existing = await executeQuery(checkQuery, [email]);

  if (existing.length > 0) {
    throw new Error("Student with this email already exists");
  }

  // Validate phone number is provided
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    throw new Error("Phone number is required for verification");
  }

  // Generate new student ID
  const studentId = await generateId();

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create student record (phone verification will be done via OTP)
  const createQuery = `
    INSERT INTO Students 
    (id, name, email, password, phoneNumber, cityOrTown, country, profilePhoto, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  await executeQuery(createQuery, [
    studentId,
    name,
    email,
    hashedPassword,
    phoneNumber,
    cityOrTown || null,
    country || null,
    profilePhotoUrl || null,
  ]);

  logger.info(
    "Student registered successfully (pending OTP verification):",
    studentId
  );

  // Send welcome email (don't wait for it, don't fail if it errors)
  const emailService = require("./emailService");
  emailService.sendWelcomeEmail({ email, name }).catch((error) => {
    logger.error("Failed to send welcome email:", error);
    // Continue registration even if email fails
  });

  // Note: Token will be generated after OTP verification
  // For now, return studentId so frontend can proceed to OTP verification
  return {
    studentId,
    student: {
      id: studentId,
      name,
      email,
      phoneNumber: phoneNumber,
      cityOrTown: cityOrTown || null,
      country: country || null,
      profilePhoto: profilePhotoUrl || null,
      hasPremium: false,
    },
    requiresOTPVerification: true,
  };
};

/**
 * Complete student registration after OTP verification
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>} - Student data with token
 */
const completeStudentRegistration = async (studentId) => {
  // Get student data
  const query = "SELECT * FROM Students WHERE id = ?";
  const students = await executeQuery(query, [studentId]);

  if (students.length === 0) {
    throw new Error("Student not found");
  }

  const student = students[0];

  // Verify phone number is verified via OTP
  const otpService = require("./otpService");
  const isVerified = await otpService.isPhoneVerified(
    studentId,
    "student",
    student.phoneNumber
  );

  if (!isVerified) {
    throw new Error(
      "Phone number must be verified before completing registration"
    );
  }

  logger.info("Student registration completed:", studentId);

  // Generate JWT token
  const token = generateToken({
    id: student.id,
    email: student.email,
    role: "student",
  });

  // Get student premium status
  const premiumStatus = await getStudentPremiumStatus(student.email);

  return {
    token,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phoneNumber: student.phoneNumber,
      cityOrTown: student.cityOrTown,
      country: student.country,
      profilePhoto: student.profilePhoto,
      created: student.created,
      updated: student.updated,
      hasPremium: premiumStatus?.hasPremium || false,
    },
  };
};

/**
 * Login a student
 * @param {String} email - Student email
 * @param {String} password - Plain text password
 * @returns {Promise<Object>} - Student data and token
 */
const loginStudent = async (email, password) => {
  // Find student by email
  const query = "SELECT * FROM Students WHERE email = ?";
  const students = await executeQuery(query, [email]);

  if (students.length === 0) {
    throw new Error("Invalid email or password");
  }

  const student = students[0];

  // Check password
  const isPasswordValid = await comparePassword(password, student.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Check if phone number is verified (block login until OTP verified)
  if (student.phoneNumber) {
    const otpService = require("./otpService");
    const isPhoneVerified = await otpService.isPhoneVerified(
      student.id,
      "student",
      student.phoneNumber
    );

    if (!isPhoneVerified) {
      // Throw error with user data for frontend to show OTP verification
      const error = new Error(
        "Please verify your phone number with OTP before logging in. Check your WhatsApp for the verification code."
      );
      error.requiresOTPVerification = true;
      error.userId = student.id;
      error.phoneNumber = student.phoneNumber;
      error.userType = "student";
      throw error;
    }
  }

  // Get student premium status
  const premiumStatus = await getStudentPremiumStatus(student.email);
  logger.info("Student logged in successfully:", student.id, premiumStatus);

  // Generate JWT token
  const token = generateToken({
    id: student.id,
    email: student.email,
    role: "student",
  });

  return {
    token,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phoneNumber: student.phoneNumber,
      cityOrTown: student.cityOrTown,
      country: student.country,
      profilePhoto: student.profilePhoto,
      created: student.created,
      updated: student.updated,
      hasPremium: premiumStatus?.hasPremium || false,
    },
  };
};

/**
 * Login an admin
 * @param {String} email - Admin email
 * @param {String} password - Plain text password
 * @returns {Promise<Object>} - Admin data and token
 */
const loginAdmin = async (email, password) => {
  // Find admin by email
  const query = "SELECT * FROM Admins WHERE email = ?";
  const admins = await executeQuery(query, [email]);

  if (admins.length === 0) {
    throw new Error("Invalid email or password");
  }

  const admin = admins[0];

  // Check password
  const isPasswordValid = await comparePassword(password, admin.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Update last login
  await executeQuery("UPDATE Admins SET lastLogin = NOW() WHERE id = ?", [
    admin.id,
  ]);

  logger.info("Admin logged in successfully:", admin.id);

  // Generate JWT token
  const token = generateToken({
    id: admin.id,
    email: admin.email,
    role: "admin",
  });

  return {
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role || "admin",
      lastLogin: admin.lastLogin,
      created: admin.created,
      updated: admin.updated,
    },
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  registerTeacher,
  completeTeacherRegistration,
  loginTeacher,
  registerStudent,
  completeStudentRegistration,
  loginStudent,
  loginAdmin,
};
