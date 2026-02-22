const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { executeQuery, generateId } = require("./databaseService");
const jwtConfig = require("../config/jwt");
const logger = require("../utils/logger");
const {
  getStudentPremiumStatus,
  getTeacherPremiumStatus,
} = require("./premiumService");

const EMAIL_VERIFICATION_EXPIRY_MINUTES = 10;

/**
 * Generate a 6-digit email verification OTP code
 * @returns {String} - 6-digit code
 */
const generateEmailVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store email verification token and send verification email
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} email - User email
 * @param {String} name - User name
 */
const sendEmailVerification = async (userId, userType, email, name) => {
  const verificationCode = generateEmailVerificationCode();
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000,
  );

  console.log("verificationCode", verificationCode);
  console.log("expiresAt", expiresAt);

  const table = userType === "teacher" ? "Teachers" : "Students";
  await executeQuery(
    `UPDATE ${table} SET emailVerificationToken = ?, emailVerificationExpiry = ?, updated = NOW() WHERE id = ?`,
    [verificationCode, expiresAt, userId],
  );

  // Send verification email
  const emailService = require("./emailService");
  await emailService.sendEmailVerificationEmail({
    email,
    name,
    otpCode: verificationCode,
    userType,
  });

  logger.info(
    `Email verification code sent to ${email} for ${userType} ${userId}`,
  );
};

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
  const checkQuery =
    "SELECT * FROM Teachers WHERE email = ? or phoneNumber = ?";
  const existing = await executeQuery(checkQuery, [email, phoneNumber]);

  if (existing.length > 0) {
    throw new Error("Tutor with this email or phone number already exists");
  }
  // Generate new teacher ID
  const teacherId = await generateId();

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create teacher record with pending status
  const createQuery = `
    INSERT INTO Teachers 
    (id, name, email, password, phoneNumber, cityOrTown, country, profilePhoto, about, status, emailVerified, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NOW(), NOW())
  `;

  const defaultAbout =
    "I am a passionate educator dedicated to helping students achieve their learning goals.";

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

  // Send email verification OTP
  try {
    await sendEmailVerification(teacherId, "teacher", email, name);
  } catch (emailError) {
    logger.error("Failed to send email verification:", emailError);
    // Continue registration even if email fails - user can resend
  }

  // Send notification to admin (don't wait for it, don't fail if it errors)
  const emailService = require("./emailService");
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
    requiresEmailVerification: true,
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
    teacher.phoneNumber,
  );

  if (!isVerified) {
    throw new Error(
      "Phone number must be verified before completing registration",
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

  // Check if email is verified
  if (!teacher.emailVerified) {
    const error = new Error(
      "Please verify your email address before logging in. Check your inbox for the verification code.",
    );
    error.requiresEmailVerification = true;
    error.userId = teacher.id;
    error.email = teacher.email;
    error.userName = teacher.name;
    error.userType = "teacher";
    throw error;
  }

  // Check if phone number is verified (block login until OTP verified)
  if (teacher.phoneNumber) {
    const otpService = require("./otpService");
    const isPhoneVerified = await otpService.isPhoneVerified(
      teacher.id,
      "teacher",
      teacher.phoneNumber,
    );

    if (!isPhoneVerified) {
      // Throw error with user data for frontend to show OTP verification
      const error = new Error(
        "Please verify your phone number with OTP before logging in. Check your WhatsApp for the verification code.",
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

  // Create student record (email verification will be done via OTP)
  const createQuery = `
    INSERT INTO Students 
    (id, name, email, password, phoneNumber, cityOrTown, country, profilePhoto, emailVerified, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
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
    "Student registered successfully (pending email verification):",
    studentId,
  );

  // Send email verification OTP
  try {
    await sendEmailVerification(studentId, "student", email, name);
  } catch (emailError) {
    logger.error("Failed to send email verification:", emailError);
    // Continue registration even if email fails - user can resend
  }

  // Return studentId so frontend can proceed to email verification
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
    requiresEmailVerification: true,
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
    student.phoneNumber,
  );

  if (!isVerified) {
    throw new Error(
      "Phone number must be verified before completing registration",
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

  // Check if email is verified
  if (!student.emailVerified) {
    const error = new Error(
      "Please verify your email address before logging in. Check your inbox for the verification code.",
    );
    error.requiresEmailVerification = true;
    error.userId = student.id;
    error.email = student.email;
    error.userName = student.name;
    error.userType = "student";
    try {
      await sendEmailVerification(student.id, "student", email, student.name);
    } catch (emailError) {
      logger.error("Failed to send email verification:", emailError);
      // Continue registration even if email fails - user can resend
    }
    throw error;
  }

  // Students do NOT require WhatsApp phone verification

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

/**
 * Verify email address with OTP code
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} email - User email
 * @param {String} otpCode - OTP code to verify
 * @returns {Promise<Object>} - Verification result
 */
const verifyEmailToken = async (userId, userType, email, otpCode) => {
  const table = userType === "teacher" ? "Teachers" : "Students";
  const query = `SELECT * FROM ${table} WHERE id = ? AND email = ?`;
  const users = await executeQuery(query, [userId, email]);

  if (users.length === 0) {
    throw new Error("User not found");
  }

  const user = users[0];

  if (user.emailVerified) {
    return { alreadyVerified: true, message: "Email is already verified" };
  }

  if (!user.emailVerificationToken) {
    throw new Error("No verification code found. Please request a new one.");
  }

  if (new Date(user.emailVerificationExpiry) < new Date()) {
    throw new Error("Verification code has expired. Please request a new one.");
  }

  if (user.emailVerificationToken !== otpCode) {
    throw new Error("Invalid verification code. Please try again.");
  }

  // Mark email as verified and clear the token
  await executeQuery(
    `UPDATE ${table} SET emailVerified = 1, emailVerificationToken = NULL, emailVerificationExpiry = NULL, updated = NOW() WHERE id = ?`,
    [userId],
  );

  logger.info(`Email verified successfully for ${userType} ${userId}`);

  // Send welcome email after verification
  const emailService = require("./emailService");
  if (userType === "teacher") {
    emailService
      .sendTeacherWelcomeEmail({ email, name: user.name })
      .catch((error) => {
        logger.error("Failed to send teacher welcome email:", error);
      });
  } else {
    emailService.sendWelcomeEmail({ email, name: user.name }).catch((error) => {
      logger.error("Failed to send welcome email:", error);
    });
  }

  // For teachers: they still need WhatsApp OTP verification
  if (userType === "teacher") {
    return {
      verified: true,
      message: "Email verified successfully",
      requiresOTPVerification: true,
      userId: user.id,
      phoneNumber: user.phoneNumber,
      userType: "teacher",
      userName: user.name,
    };
  }

  // For students: auto-login after email verification (no WhatsApp needed)
  const premiumStatus = await getStudentPremiumStatus(user.email);
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: "student",
  });

  return {
    verified: true,
    message: "Email verified successfully",
    token,
    student: {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      cityOrTown: user.cityOrTown,
      country: user.country,
      profilePhoto: user.profilePhoto,
      created: user.created,
      updated: user.updated,
      hasPremium: premiumStatus?.hasPremium || false,
    },
  };
};

/**
 * Resend email verification code
 * @param {String} userId - User ID
 * @param {String} userType - 'student' or 'teacher'
 * @param {String} email - User email
 * @returns {Promise<Object>} - Result
 */
const resendEmailVerification = async (userId, userType, email) => {
  const table = userType === "teacher" ? "Teachers" : "Students";
  const query = `SELECT * FROM ${table} WHERE id = ? AND email = ?`;
  const users = await executeQuery(query, [userId, email]);

  if (users.length === 0) {
    throw new Error("User not found");
  }

  const user = users[0];

  if (user.emailVerified) {
    return { alreadyVerified: true, message: "Email is already verified" };
  }

  await sendEmailVerification(userId, userType, email, user.name);

  return {
    success: true,
    message: "Verification code sent successfully",
    expiresInMinutes: EMAIL_VERIFICATION_EXPIRY_MINUTES,
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
  verifyEmailToken,
  resendEmailVerification,
};
