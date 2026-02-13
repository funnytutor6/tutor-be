const { executeQuery } = require("../config/database");
const logger = require("../utils/logger");

/**
 * Helper to check if a column exists in a table
 */
const columnExists = async (tableName, columnName) => {
  const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = ?
    `;
  const result = await executeQuery(checkQuery, [tableName, columnName]);
  return result.length > 0;
};

/**
 * Helper to add a column if it doesn't exist
 */
const addColumnIfNotExists = async (
  tableName,
  columnName,
  columnDefinition,
) => {
  const exists = await columnExists(tableName, columnName);
  if (!exists) {
    logger.info(`Adding '${columnName}' column to ${tableName} table...`);
    const addQuery = `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`;
    await executeQuery(addQuery);
    logger.info(
      `✓ Successfully added '${columnName}' column to ${tableName} table`,
    );
  } else {
    logger.info(
      `✓ '${columnName}' column already exists in ${tableName} table`,
    );
  }
};

/**
 * Setup database schema - Add missing columns
 * This function checks and adds required columns to tables if they don't exist
 */
const setupDatabase = async () => {
  try {
    logger.info("Starting database setup...");

    // Add 'about' column to Teachers table
    await addColumnIfNotExists(
      "Teachers",
      "about",
      "about TEXT NULL COMMENT 'Teacher bio/description - cannot contain links, emails, or contact information' AFTER profilePhoto",
    );

    // Add email verification columns to Teachers table
    await addColumnIfNotExists(
      "Teachers",
      "emailVerified",
      "emailVerified TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether the teacher email is verified' AFTER email",
    );
    await addColumnIfNotExists(
      "Teachers",
      "emailVerificationToken",
      "emailVerificationToken VARCHAR(10) NULL COMMENT 'Email verification OTP code' AFTER emailVerified",
    );
    await addColumnIfNotExists(
      "Teachers",
      "emailVerificationExpiry",
      "emailVerificationExpiry DATETIME NULL COMMENT 'Email verification token expiry time' AFTER emailVerificationToken",
    );

    // Add email verification columns to Students table
    await addColumnIfNotExists(
      "Students",
      "emailVerified",
      "emailVerified TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether the student email is verified' AFTER email",
    );
    await addColumnIfNotExists(
      "Students",
      "emailVerificationToken",
      "emailVerificationToken VARCHAR(10) NULL COMMENT 'Email verification OTP code' AFTER emailVerified",
    );
    await addColumnIfNotExists(
      "Students",
      "emailVerificationExpiry",
      "emailVerificationExpiry DATETIME NULL COMMENT 'Email verification token expiry time' AFTER emailVerificationToken",
    );

    logger.info("Database setup completed successfully");
    return { success: true, message: "Database setup completed" };
  } catch (error) {
    logger.error("Error during database setup:", error);
    throw error;
  }
};

/**
 * Run database setup on server start
 * Call this function when the server starts
 */
const initializeDatabase = async () => {
  try {
    await setupDatabase();
  } catch (error) {
    logger.error("Failed to initialize database:", error);
    // Don't crash the server, just log the error
    logger.warn(
      "Server will continue, but some features may not work correctly",
    );
  }
};

module.exports = {
  setupDatabase,
  initializeDatabase,
};
