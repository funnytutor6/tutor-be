const { executeQuery } = require("./databaseService");
const { hashPassword, comparePassword } = require("./authService");
const logger = require("../utils/logger");

/**
 * Get paginated teachers with search
 * @param {{ page: number, pageSize: number, search?: string }} options
 * @returns {Promise<{ items: Array, total: number, page: number, pageSize: number, totalPages: number }>}
 */
const getAllTeachers = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "WHERE 1 = 1";
  const params = [];

  if (search) {
    const like = `%${search}%`;
    whereClause +=
      " AND (t.name LIKE ? OR t.email LIKE ? OR t.phoneNumber LIKE ? OR t.cityOrTown LIKE ? OR t.country LIKE ?)";
    params.push(like, like, like, like, like);
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM Teachers t
    ${whereClause}
  `;

  const [{ total }] = await executeQuery(countQuery, params);

  const dataQuery = `
    SELECT 
      t.id,
      t.name,
      t.email,
      t.phoneNumber,
      t.cityOrTown,
      t.country,
      t.profilePhoto,
      t.about,
      t.status,
      t.created,
      t.updated
    FROM Teachers t
    ${whereClause}
    ORDER BY t.created DESC
    LIMIT ? OFFSET ?
  `;

  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    items: items.map((teacher) => ({
      ...teacher,
      status: teacher.status || "pending",
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
};

/**
 * Get paginated pending teachers with search
 * @param {{ page: number, pageSize: number, search?: string }} options
 * @returns {Promise<{ items: Array, total: number, page: number, pageSize: number, totalPages: number }>}
 */
const getPendingTeachers = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "WHERE t.status = 'pending'";
  const params = [];

  if (search) {
    const like = `%${search}%`;
    whereClause +=
      " AND (t.name LIKE ? OR t.email LIKE ? OR t.phoneNumber LIKE ? OR t.cityOrTown LIKE ? OR t.country LIKE ?)";
    params.push(like, like, like, like, like);
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM Teachers t
    ${whereClause}
  `;

  const [{ total }] = await executeQuery(countQuery, params);

  const dataQuery = `
    SELECT 
      t.id,
      t.name,
      t.email,
      t.phoneNumber,
      t.cityOrTown,
      t.country,
      t.profilePhoto,
      t.about,
      t.status,
      t.created,
      t.updated
    FROM Teachers t
    ${whereClause}
    ORDER BY t.created DESC
    LIMIT ? OFFSET ?
  `;

  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    items: items.map((teacher) => ({
      ...teacher,
      status: teacher.status || "pending",
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
};

/**
 * Update teacher status
 * @param {String} teacherId - Teacher ID
 * @param {String} status - New status (approved, rejected, pending)
 * @param {String} rejectionReason - Optional reason for rejection
 * @returns {Promise<Object>} - Updated teacher data
 */
const updateTeacherStatus = async (
  teacherId,
  status,
  rejectionReason = null
) => {
  const validStatuses = ["approved", "rejected", "pending"];
  if (!validStatuses.includes(status)) {
    throw new Error(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const updateQuery =
    "UPDATE Teachers SET status = ?, updated = NOW() WHERE id = ?";
  const result = await executeQuery(updateQuery, [status, teacherId]);

  if (result.affectedRows === 0) {
    throw new Error("Tutor not found");
  }

  logger.info(`Tutor status updated to ${status}:`, teacherId);

  const query = "SELECT * FROM Teachers WHERE id = ?";
  const teachers = await executeQuery(query, [teacherId]);
  const teacher = teachers[0];
  delete teacher.password;

  // Send approval email if status is "approved"
  if (status === "approved") {
    const emailService = require("./emailService");
    emailService
      .sendTeacherApprovalEmail({
        email: teacher.email,
        name: teacher.name,
      })
      .catch((error) => {
        logger.error("Failed to send Tutor approval email:", error);
        // Continue even if email fails
      });
  }

  // Send rejection email if status is "rejected"
  if (status === "rejected") {
    const emailService = require("./emailService");
    emailService
      .sendTeacherRejectionEmail({
        email: teacher.email,
        name: teacher.name,
        rejectionReason: rejectionReason,
      })
      .catch((error) => {
        logger.error("Failed to send teacher rejection email:", error);
        // Continue even if email fails
      });
  }

  return teacher;
};

/**
 * Get admin by ID
 * @param {String} adminId - Admin ID
 * @returns {Promise<Object>} - Admin data
 */
const getAdminById = async (adminId) => {
  const query = "SELECT * FROM Admins WHERE id = ?";
  const admins = await executeQuery(query, [adminId]);

  if (admins.length === 0) {
    throw new Error("Admin not found");
  }

  const admin = admins[0];
  // Remove password from response
  delete admin.password;

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role || "admin",
    lastLogin: admin.lastLogin,
    created: admin.created,
    updated: admin.updated,
  };
};

/**
 * Update admin email
 * @param {String} adminId - Admin ID
 * @param {String} newEmail - New email address
 * @returns {Promise<Object>} - Updated admin data
 */
const updateAdminEmail = async (adminId, newEmail) => {
  // Check if email already exists
  const checkQuery = "SELECT * FROM Admins WHERE email = ? AND id != ?";
  const existing = await executeQuery(checkQuery, [newEmail, adminId]);

  if (existing.length > 0) {
    throw new Error("Email already in use");
  }

  // Update email
  const updateQuery =
    "UPDATE Admins SET email = ?, updated = NOW() WHERE id = ?";
  const result = await executeQuery(updateQuery, [newEmail, adminId]);

  if (result.affectedRows === 0) {
    throw new Error("Admin not found");
  }

  logger.info("Admin email updated:", adminId);

  return await getAdminById(adminId);
};

/**
 * Update admin password
 * @param {String} adminId - Admin ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Promise<Object>} - Updated admin data
 */
const updateAdminPassword = async (adminId, currentPassword, newPassword) => {
  // Get current admin
  const query = "SELECT * FROM Admins WHERE id = ?";
  const admins = await executeQuery(query, [adminId]);

  if (admins.length === 0) {
    throw new Error("Admin not found");
  }

  const admin = admins[0];

  // Verify current password
  const isPasswordValid = await comparePassword(
    currentPassword,
    admin.password
  );
  if (!isPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  const updateQuery =
    "UPDATE Admins SET password = ?, updated = NOW() WHERE id = ?";
  const result = await executeQuery(updateQuery, [hashedPassword, adminId]);

  if (result.affectedRows === 0) {
    throw new Error("Failed to update password");
  }

  logger.info("Admin password updated:", adminId);

  return await getAdminById(adminId);
};

/**
 * Update admin email and password
 * @param {String} adminId - Admin ID
 * @param {String} newEmail - New email address (optional)
 * @param {String} currentPassword - Current password (required if updating password)
 * @param {String} newPassword - New password (optional)
 * @returns {Promise<Object>} - Updated admin data
 */
const updateAdminProfile = async (
  adminId,
  { email, currentPassword, newPassword }
) => {
  // If updating email
  if (email) {
    await updateAdminEmail(adminId, email);
  }

  // If updating password
  if (newPassword) {
    if (!currentPassword) {
      throw new Error("Current password is required to update password");
    }
    await updateAdminPassword(adminId, currentPassword, newPassword);
  }

  // Return updated admin data
  return await getAdminById(adminId);
};

/**
 * Get admin dashboard metrics
 * @returns {Promise<Object>} - Dashboard metrics
 */
const getDashboardMetrics = async () => {
  // Get all counts in parallel
  const [
    totalTeachersResult,
    pendingTeachersResult,
    totalStudentsResult,
    studentPostsResult,
    teacherPostsResult,
    paidTeacherSubscriptionsResult,
    totalTeacherSubscriptionsResult,
    paidStudentSubscriptionsResult,
    totalStudentSubscriptionsResult,
    newsletterSubscribersResult,
  ] = await Promise.all([
    executeQuery("SELECT COUNT(*) as count FROM Teachers"),
    executeQuery(
      "SELECT COUNT(*) as count FROM Teachers WHERE status = 'pending'"
    ),
    executeQuery("SELECT COUNT(*) as count FROM Students"),
    executeQuery("SELECT COUNT(*) as count FROM StudentPosts"),
    executeQuery("SELECT COUNT(*) as count FROM TeacherPosts"),
    executeQuery(
      "SELECT COUNT(*) as count FROM findtutor_premium_teachers WHERE ispaid = TRUE"
    ),
    executeQuery("SELECT COUNT(*) as count FROM findtutor_premium_teachers"),
    executeQuery(
      "SELECT COUNT(*) as count FROM findtitor_premium_student WHERE ispayed = TRUE"
    ),
    executeQuery("SELECT COUNT(*) as count FROM findtitor_premium_student"),
    executeQuery("SELECT COUNT(*) as count FROM findtutor_subcriptions"),
  ]);

  return {
    totalTeachers: totalTeachersResult[0]?.count || 0,
    pendingTeachers: pendingTeachersResult[0]?.count || 0,
    totalStudents: totalStudentsResult[0]?.count || 0,
    studentPosts: studentPostsResult[0]?.count || 0,
    teacherPosts: teacherPostsResult[0]?.count || 0,
    paidTeacherSubscriptions: paidTeacherSubscriptionsResult[0]?.count || 0,
    totalTeacherSubscriptions: totalTeacherSubscriptionsResult[0]?.count || 0,
    paidStudentSubscriptions: paidStudentSubscriptionsResult[0]?.count || 0,
    totalStudentSubscriptions: totalStudentSubscriptionsResult[0]?.count || 0,
    newsletterSubscribers: newsletterSubscribersResult[0]?.count || 0,
  };
};

/**
 * Get all teacher subscriptions for admin with subscription details
 * @param {{ page: number, pageSize: number, search?: string }} options
 * @returns {Promise<Object>} - Teacher subscriptions
 */
const getAllTeacherSubscriptionsForAdmin = async ({
  page,
  pageSize,
  search,
}) => {
  const offset = (page - 1) * pageSize;

  let whereClause = "WHERE 1 = 1";
  const params = [];

  if (search) {
    const like = `%${search}%`;
    whereClause += " AND (t.mail LIKE ? OR t.mail LIKE ? OR t.mail LIKE ?)";
    params.push(like, like, like);
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM findtutor_premium_teachers t
    ${whereClause}
  `;

  const dataQuery = `
    SELECT 
      t.id, t.mail, t.ispaid, t.paymentDate, t.stripeSessionId, t.paymentAmount,
      t.stripeCustomerId, t.stripeSubscriptionId, t.subscriptionStatus,
      t.currentPeriodStart, t.currentPeriodEnd, t.cancelAtPeriodEnd, t.canceledAt,
      t.created, t.updated
    FROM findtutor_premium_teachers t
    ${whereClause}
    ORDER BY t.created DESC
    LIMIT ? OFFSET ?
  `;

  const [{ total }] = await executeQuery(countQuery, params);
  const items = await executeQuery(dataQuery, [...params, pageSize, offset]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
};

/**
 * Get all premium students for admin
 * @param {{ page: number, pageSize: number, search?: string }} options
 * @returns {Promise<Object>} - Premium students
 */
const getAllPremiumStudentsForAdmin = async ({ page, pageSize, search }) => {
  try {
    const offset = (page - 1) * pageSize;

    let query = "SELECT * FROM findtitor_premium_student";
    let params = [];

    // Add filtering if provided (basic email filter)
    if (search) {
      const like = `%${search}%`;
      query += " WHERE email LIKE ?";
      params.push(like);
    }

    query += " ORDER BY created DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    const records = await executeQuery(query, params);

    // Get total count for pagination
    const countQuery =
      "SELECT COUNT(*) as total FROM findtitor_premium_student";
    const [countResult] = await executeQuery(countQuery);

    return {
      items: records,
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize),
    };
  } catch (error) {
    console.error("Error fetching student premium records:", error);
    throw new Error("Failed to fetch records");
  }
};
module.exports = {
  // Admin profile operations
  getAdminById,
  updateAdminEmail,
  updateAdminPassword,
  updateAdminProfile,
  // Teacher admin operations
  getAllTeachers,
  getPendingTeachers,
  updateTeacherStatus,
  // Dashboard metrics
  getDashboardMetrics,
  // Teacher subscriptions
  getAllTeacherSubscriptionsForAdmin,
  // Premium students
  getAllPremiumStudentsForAdmin,
  // Reports
  getReportsData: async () => {
    // 1. Signups (Daily - Last 30 Days)
    const signupsDailyQuery = `
      SELECT DATE(created) as date, 'teacher' as type, COUNT(*) as count 
      FROM Teachers 
      WHERE created >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created)
      UNION ALL
      SELECT DATE(created) as date, 'student' as type, COUNT(*) as count 
      FROM Students 
      WHERE created >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created)
      ORDER BY date
    `;
    const signupsDaily = await executeQuery(signupsDailyQuery);

    // 1b. Signups (Monthly - Last 12 Months)
    const signupsMonthlyQuery = `
      SELECT DATE_FORMAT(created, '%Y-%m-01') as date, 'teacher' as type, COUNT(*) as count 
      FROM Teachers 
      WHERE created >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created, '%Y-%m-01')
      UNION ALL
      SELECT DATE_FORMAT(created, '%Y-%m-01') as date, 'student' as type, COUNT(*) as count 
      FROM Students 
      WHERE created >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created, '%Y-%m-01')
      ORDER BY date
    `;
    const signupsMonthly = await executeQuery(signupsMonthlyQuery);

    // 2. Active subscriptions count & MRR
    const teacherSubscriptionsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN subscriptionStatus = 'active' OR subscriptionStatus = 'trialing' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN subscriptionStatus = 'active' OR subscriptionStatus = 'trialing' THEN paymentAmount ELSE 0 END) as mrr,
        SUM(CASE WHEN subscriptionStatus = 'canceled' THEN 1 ELSE 0 END) as canceled_count,
        SUM(CASE WHEN subscriptionStatus IN ('past_due', 'unpaid', 'incomplete_expired') THEN 1 ELSE 0 END) as failed_count
      FROM findtutor_premium_teachers
    `;
    const [teacherStats] = await executeQuery(teacherSubscriptionsQuery);

    const studentSubscriptionsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN subscriptionStatus = 'active' OR subscriptionStatus = 'trialing' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN subscriptionStatus = 'active' OR subscriptionStatus = 'trialing' THEN paymentAmount ELSE 0 END) as mrr,
        SUM(CASE WHEN subscriptionStatus = 'canceled' THEN 1 ELSE 0 END) as canceled_count,
        SUM(CASE WHEN subscriptionStatus IN ('past_due', 'unpaid', 'incomplete_expired') THEN 1 ELSE 0 END) as failed_count
      FROM findtitor_premium_student
    `;
    const [studentStats] = await executeQuery(studentSubscriptionsQuery);

    // 4. Total posts created (Teacher/Student)
    const postsQuery = `
      SELECT 'teacher' as type, COUNT(*) as count FROM TeacherPosts
      UNION ALL
      SELECT 'student' as type, COUNT(*) as count FROM StudentPosts
    `;
    const posts = await executeQuery(postsQuery);

    // 5. Most active subjects (Student Requests)
    const subjectsQuery = `
      SELECT subject, COUNT(*) as count 
      FROM StudentPosts 
      GROUP BY subject 
      ORDER BY count DESC 
      LIMIT 10
    `;
    const subjects = await executeQuery(subjectsQuery);

    // 6. Most active locations (Teachers)
    const locationsQuery = `
      SELECT cityOrTown as location, COUNT(*) as count 
      FROM Teachers 
      WHERE cityOrTown IS NOT NULL AND cityOrTown != ''
      GROUP BY cityOrTown 
      ORDER BY count DESC 
      LIMIT 10
    `;
    const locations = await executeQuery(locationsQuery);

    // 7. Pending approvals metrics
    const pendingQuery = `
      SELECT COUNT(*) as count FROM Teachers WHERE status = 'pending'
    `;
    const [pending] = await executeQuery(pendingQuery);

    return {
      signups: {
        daily: signupsDaily,
        monthly: signupsMonthly
      },
      subscriptionStats: {
        total: Number(teacherStats?.total || 0) + Number(studentStats?.total || 0),
        active: Number(teacherStats?.active_count || 0) + Number(studentStats?.active_count || 0),
        mrr: Number(teacherStats?.mrr || 0) + Number(studentStats?.mrr || 0),
        cancellations: Number(teacherStats?.canceled_count || 0) + Number(studentStats?.canceled_count || 0),
        failedPayments: Number(teacherStats?.failed_count || 0) + Number(studentStats?.failed_count || 0)
      },
      posts: {
        teacher: Number(posts.find(p => p.type === 'teacher')?.count || 0),
        student: Number(posts.find(p => p.type === 'student')?.count || 0)
      },
      topSubjects: subjects,
      topLocations: locations,
      pendingApprovals: pending?.count || 0
    };
  }
};

