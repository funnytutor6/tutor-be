const { executeQuery } = require("../services/databaseService");
const logger = require("./logger");

/**
 * Add status column to Teachers table if it doesn't exist
 */
const addStatusColumn = async () => {
  try {
    // Check if status column exists
    const checkQuery = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teachers' AND COLUMN_NAME = 'status'`;
    const columns = await executeQuery(checkQuery);

    if (columns.length === 0) {
      // Column doesn't exist, add it
      await executeQuery(
        `ALTER TABLE Teachers ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'`
      );
      logger.info("Successfully added status column to Teachers table");
      
      // Update existing records to have 'pending' status
      await executeQuery(
        `UPDATE Teachers SET status = 'pending' WHERE status IS NULL`
      );
      logger.info("Updated existing teachers with pending status");
      
      return true;
    } else {
      logger.info("Status column already exists in Teachers table");
      return false;
    }
  } catch (error) {
    logger.error("Error adding status column:", error);
    throw error;
  }
};

module.exports = { addStatusColumn };
