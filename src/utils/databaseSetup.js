const { executeQuery } = require("../config/database");
const logger = require("../utils/logger");

/**
 * Setup database schema - Add missing columns
 * This function checks and adds the 'about' column to Teachers table if it doesn't exist
 */
const setupDatabase = async () => {
    try {
        logger.info("Starting database setup...");

        // Check if 'about' column exists in Teachers table
        const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Teachers' 
        AND COLUMN_NAME = 'about'
    `;

        const columnExists = await executeQuery(checkColumnQuery);

        if (columnExists.length === 0) {
            logger.info("Adding 'about' column to Teachers table...");

            // Add 'about' column without default value
            const addColumnQuery = `
        ALTER TABLE Teachers 
        ADD COLUMN about TEXT NULL 
        COMMENT 'Teacher bio/description - cannot contain links, emails, or contact information' 
        AFTER profilePhoto
      `;

            await executeQuery(addColumnQuery);
            logger.info("✓ Successfully added 'about' column to Teachers table");
        } else {
            logger.info("✓ 'about' column already exists in Teachers table");
        }

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
        logger.warn("Server will continue, but some features may not work correctly");
    }
};

module.exports = {
    setupDatabase,
    initializeDatabase,
};
