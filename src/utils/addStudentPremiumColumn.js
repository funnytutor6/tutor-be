const { executeQuery } = require("../services/databaseService");
const logger = require("./logger");

/**
 * Ensure the Students table has the hasPremium column
 */
const ensureStudentPremiumColumn = async () => {
  try {
    const checkQuery = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Students' AND COLUMN_NAME = 'hasPremium'`;
    const columns = await executeQuery(checkQuery);

    if (columns.length === 0) {
      await executeQuery(
        `ALTER TABLE Students ADD COLUMN hasPremium TINYINT(1) DEFAULT 0`
      );
      await executeQuery(
        `UPDATE Students SET hasPremium = 0 WHERE hasPremium IS NULL`
      );
      logger.info("Added hasPremium column to Students table");
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Error ensuring hasPremium column:", error);
    throw error;
  }
};

module.exports = { ensureStudentPremiumColumn };

