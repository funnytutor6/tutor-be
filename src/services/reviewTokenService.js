const crypto = require("crypto");
const { executeQuery, generateId } = require("./databaseService");
const logger = require("../utils/logger");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const generateReviewToken = async (teacherId) => {
  const id = await generateId();
  const token = crypto.randomBytes(32).toString("hex");

  const query = `
    INSERT INTO ReviewTokens (id, teacherId, token)
    VALUES (?, ?, ?)
  `;
  await executeQuery(query, [id, teacherId, token]);

  const link = `${FRONTEND_URL}/review/public/${token}`;
  logger.info(`Review token generated for teacher ${teacherId}`);

  return {
    id,
    token,
    link,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
};

const validateToken = async (token) => {
  const query = `
    SELECT rt.id, rt.teacherId, rt.isActive, rt.expiresAt, t.name as teacherName
    FROM ReviewTokens rt
    JOIN Teachers t ON rt.teacherId = t.id
    WHERE rt.token = ?
  `;
  const results = await executeQuery(query, [token]);

  if (results.length === 0) {
    return { valid: false, reason: "Token not found" };
  }

  const tokenRow = results[0];

  if (!tokenRow.isActive) {
    return { valid: false, reason: "This review link has been deactivated" };
  }

  if (tokenRow.expiresAt && new Date(tokenRow.expiresAt) < new Date()) {
    return { valid: false, reason: "This review link has expired" };
  }

  return {
    valid: true,
    tokenId: tokenRow.id,
    teacherId: tokenRow.teacherId,
    teacherName: tokenRow.teacherName,
  };
};

const getTeacherTokens = async (teacherId) => {
  const query = `
    SELECT rt.id, rt.token, rt.isActive, rt.createdAt, rt.expiresAt,
      (SELECT COUNT(*) FROM PublicTutorReviews ptr WHERE ptr.tokenId = rt.id) as reviewCount
    FROM ReviewTokens rt
    WHERE rt.teacherId = ?
    ORDER BY rt.createdAt DESC
  `;
  const tokens = await executeQuery(query, [teacherId]);

  return tokens.map((t) => ({
    ...t,
    link: `${FRONTEND_URL}/review/public/${t.token}`,
    isActive: t.isActive === 1 || t.isActive === true,
  }));
};

const deactivateToken = async (tokenId, teacherId) => {
  const query = `
    UPDATE ReviewTokens
    SET isActive = FALSE
    WHERE id = ? AND teacherId = ?
  `;
  const result = await executeQuery(query, [tokenId, teacherId]);

  if (result.affectedRows === 0) {
    throw new Error("Token not found or not owned by this teacher");
  }

  logger.info(`Review token ${tokenId} deactivated by teacher ${teacherId}`);
  return true;
};

const submitPublicReview = async ({
  token,
  reviewerName,
  rating,
  reviewText,
}) => {
  const validation = await validateToken(token);

  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const id = await generateId();

  const query = `
    INSERT INTO PublicTutorReviews (id, teacherId, tokenId, reviewerName, rating, reviewText)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await executeQuery(query, [
    id,
    validation.teacherId,
    validation.tokenId,
    reviewerName,
    rating,
    reviewText || null,
  ]);

  logger.info(
    `Public review submitted for teacher ${validation.teacherId} via token ${validation.tokenId}`,
  );
  return { id, teacherName: validation.teacherName };
};

module.exports = {
  generateReviewToken,
  validateToken,
  getTeacherTokens,
  deactivateToken,
  submitPublicReview,
};
