// scripts/setupDatabase.js
const mysql = require("mysql2/promise");
require("dotenv").config();
const { generateId } = require("./src/utils/idGenerator");
const logger = require("./src/utils/logger");

const setupDatabase = async () => {
  let connection;

  try {
    logger.info("Setting up database...", process.env.DB_HOST);

    // Connect to MySQL server (without database first)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    logger.info("Connected to MySQL server");

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME;
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    logger.info(`Database '${dbName}' created or already exists`);

    // Close connection and reconnect with database selected
    await connection.end();

    // Reconnect with the specific database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    logger.info(`Connected to database '${dbName}'`);

    // Create tables
    logger.info("Creating tables...");

    // Student Premium Table
    await connection.query(`
     CREATE TABLE IF NOT EXISTS findtitor_premium_student (
    id VARCHAR(50) PRIMARY KEY,
    subject TEXT,
    email TEXT,
    mobile TEXT,
    topix TEXT,
    descripton TEXT,
    ispayed BOOLEAN DEFAULT FALSE,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paymentDate TIMESTAMP NULL,
    stripeSessionId VARCHAR(255) NULL,
    paymentAmount DECIMAL(10,2) NULL,
    stripeCustomerId VARCHAR(255) NULL,
    stripeSubscriptionId VARCHAR(255) NULL,
    subscriptionStatus ENUM('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete') NULL,
    currentPeriodStart TIMESTAMP NULL,
    currentPeriodEnd TIMESTAMP NULL,
    cancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
    canceledAt TIMESTAMP NULL,
    INDEX idx_student_email (email(255)),
    INDEX idx_student_payment (ispayed, created),
    INDEX idx_stripe_customer (stripeCustomerId),
    INDEX idx_stripe_subscription (stripeSubscriptionId),
    INDEX idx_subscription_status (subscriptionStatus)
)

    `);
    logger.info("Table findtitor_premium_student created");

    // Teacher Premium Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS findtutor_premium_teachers (
        id VARCHAR(50) PRIMARY KEY,
        link_or_video BOOLEAN DEFAULT TRUE,
        link1 TEXT,
        link2 TEXT,
        link3 TEXT,
        video1 VARCHAR(255),
        video2 VARCHAR(255),
        video3 VARCHAR(255),
        ispaid BOOLEAN DEFAULT FALSE,
        mail VARCHAR(255),
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        paymentDate TIMESTAMP NULL,
        stripeSessionId VARCHAR(255) NULL,
        paymentAmount DECIMAL(10,2) NULL,
        stripeCustomerId VARCHAR(255) NULL,
        stripeSubscriptionId VARCHAR(255) NULL,
        subscriptionStatus ENUM('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete') NULL,
        currentPeriodStart TIMESTAMP NULL,
        currentPeriodEnd TIMESTAMP NULL,
        cancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
        canceledAt TIMESTAMP NULL,
        INDEX idx_teacher_email (mail),
        INDEX idx_teacher_payment (ispaid, created),
        INDEX idx_stripe_customer (stripeCustomerId),
        INDEX idx_stripe_subscription (stripeSubscriptionId),
        INDEX idx_subscription_status (subscriptionStatus)
      )
    `);
    logger.info("Table findtutor_premium_teachers created");

    // Add subscription columns if they don't exist (for existing databases)
    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'findtutor_premium_teachers' 
        AND COLUMN_NAME = 'stripeCustomerId'
      `);

      if (columns.length === 0) {
        logger.info(
          "Adding subscription columns to findtutor_premium_teachers...",
        );
        await connection.query(`
          ALTER TABLE findtutor_premium_teachers
          ADD COLUMN stripeCustomerId VARCHAR(255) NULL AFTER paymentAmount,
          ADD COLUMN stripeSubscriptionId VARCHAR(255) NULL AFTER stripeCustomerId,
          ADD COLUMN subscriptionStatus ENUM('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete') NULL AFTER stripeSubscriptionId,
          ADD COLUMN currentPeriodStart TIMESTAMP NULL AFTER subscriptionStatus,
          ADD COLUMN currentPeriodEnd TIMESTAMP NULL AFTER currentPeriodStart,
          ADD COLUMN cancelAtPeriodEnd BOOLEAN DEFAULT FALSE AFTER currentPeriodEnd,
          ADD COLUMN canceledAt TIMESTAMP NULL AFTER cancelAtPeriodEnd,
          ADD INDEX idx_stripe_customer (stripeCustomerId),
          ADD INDEX idx_stripe_subscription (stripeSubscriptionId),
          ADD INDEX idx_subscription_status (subscriptionStatus)
        `);
        logger.info("Subscription columns added successfully");
      }
    } catch (error) {
      logger.warn(
        "Error adding subscription columns (may already exist):",
        error.message,
      );
    }

    // Add subscription columns to student premium table if they don't exist (for existing databases)
    try {
      const [studentColumns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'findtitor_premium_student' 
        AND COLUMN_NAME = 'stripeCustomerId'
      `);

      if (studentColumns.length === 0) {
        logger.info(
          "Adding subscription columns to findtitor_premium_student...",
        );
        await connection.query(`
          ALTER TABLE findtitor_premium_student
          ADD COLUMN stripeCustomerId VARCHAR(255) NULL AFTER paymentAmount,
          ADD COLUMN stripeSubscriptionId VARCHAR(255) NULL AFTER stripeCustomerId,
          ADD COLUMN subscriptionStatus ENUM('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete') NULL AFTER stripeSubscriptionId,
          ADD COLUMN currentPeriodStart TIMESTAMP NULL AFTER subscriptionStatus,
          ADD COLUMN currentPeriodEnd TIMESTAMP NULL AFTER currentPeriodStart,
          ADD COLUMN cancelAtPeriodEnd BOOLEAN DEFAULT FALSE AFTER currentPeriodEnd,
          ADD COLUMN canceledAt TIMESTAMP NULL AFTER cancelAtPeriodEnd,
          ADD INDEX idx_stripe_customer (stripeCustomerId),
          ADD INDEX idx_stripe_subscription (stripeSubscriptionId),
          ADD INDEX idx_subscription_status (subscriptionStatus)
        `);
        logger.info(
          "Subscription columns added to student premium table successfully",
        );
      }
    } catch (error) {
      logger.warn(
        "Error adding subscription columns to student table (may already exist):",
        error.message,
      );
    }

    // Subscriptions Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS findtutor_subcriptions (
        id VARCHAR(50) PRIMARY KEY,
        field VARCHAR(255),
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_subscription_email (field)
      )
    `);
    logger.info("Table findtutor_subcriptions created");

    // Teachers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Teachers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(50),
        cityOrTown VARCHAR(255),
        country VARCHAR(255),
        profilePhoto TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_teacher_email (email),
        INDEX idx_teacher_name (name),
        INDEX idx_teacher_status (status)
      )
    `);
    logger.info("Table Teachers created");

    // Add missing columns if they don't exist (for existing tables)
    try {
      await connection.query(
        `ALTER TABLE Teachers ADD COLUMN IF NOT EXISTS country VARCHAR(255)`,
      );
      logger.info("Added country column to Teachers table");
    } catch (alterError) {
      logger.warn(
        "Country column may already exist or alter failed:",
        alterError.message,
      );
    }

    try {
      // Check if status column exists
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Teachers' AND COLUMN_NAME = 'status'`,
        [process.env.DB_NAME],
      );

      if (columns.length === 0) {
        await connection.query(
          `ALTER TABLE Teachers ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'`,
        );
        logger.info("Added status column to Teachers table");
      } else {
        logger.info("Status column already exists in Teachers table");
      }
    } catch (alterError) {
      logger.error(
        "Error adding status column to Teachers table:",
        alterError.message,
      );
    }

    // Add 'about' column if it doesn't exist
    try {
      const [aboutColumns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Teachers' AND COLUMN_NAME = 'about'`,
        [process.env.DB_NAME],
      );

      if (aboutColumns.length === 0) {
        await connection.query(
          `ALTER TABLE Teachers 
           ADD COLUMN about TEXT NULL 
           COMMENT 'Teacher bio/description - cannot contain links, emails, or contact information' 
           AFTER profilePhoto`,
        );
        logger.info("✓ Added 'about' column to Teachers table");
      } else {
        logger.info("✓ 'about' column already exists in Teachers table");
      }
    } catch (aboutError) {
      logger.error(
        "Error adding 'otpVerified' column to Teachers table:",
        aboutError.message,
      );
    }

    // Migrate existing tables to use longer VARCHAR for ID columns
    logger.info("Migrating existing tables to use longer ID columns...");

    // First, handle old tables from the SQL file that might have different structure
    const oldTablesToCheck = [
      "teachers",
      "teachersposts",
      "studentpost",
      "studentprofile",
      "connectionrequests",
      "teacherpurchases",
      "postreviews",
      "studentrequests",
    ];

    for (const tableName of oldTablesToCheck) {
      try {
        // Check if old table exists and drop it
        const [tables] = await connection.query(
          `SHOW TABLES LIKE '${tableName}'`,
        );
        if (tables.length > 0) {
          await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
          logger.info(`Dropped old table: ${tableName}`);
        }
      } catch (dropError) {
        logger.warn(
          `Could not drop old table ${tableName}:`,
          dropError.message,
        );
      }
    }

    // Add 'archived' column to TeacherPosts if it doesn't exist
    try {
      const [teacherPostsColumns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'TeacherPosts' AND COLUMN_NAME = 'archived'`,
        [process.env.DB_NAME],
      );

      if (teacherPostsColumns.length === 0) {
        await connection.query(
          `ALTER TABLE TeacherPosts 
           ADD COLUMN archived BOOLEAN DEFAULT FALSE 
           COMMENT 'Whether teacher post is archived' 
           AFTER priceType,
           ADD INDEX idx_teacher_posts_archived (archived)`,
        );
        logger.info("✓ Added 'archived' column to TeacherPosts table");
      } else {
        logger.info("✓ 'archived' column already exists in TeacherPosts table");
      }
    } catch (archivedError) {
      logger.error(
        "Error adding 'archived' column to TeacherPosts table:",
        archivedError.message,
      );
    }

    // Add 'archived' column to StudentPosts if it doesn't exist
    try {
      const [studentPostsColumns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'StudentPosts' AND COLUMN_NAME = 'archived'`,
        [process.env.DB_NAME],
      );

      if (studentPostsColumns.length === 0) {
        await connection.query(
          `ALTER TABLE StudentPosts 
           ADD COLUMN archived BOOLEAN DEFAULT FALSE 
           COMMENT 'Whether student post is archived' 
           AFTER grade,
           ADD INDEX idx_student_posts_archived (archived)`,
        );
        logger.info("✓ Added 'archived' column to StudentPosts table");
      } else {
        logger.info("✓ 'archived' column already exists in StudentPosts table");
      }
    } catch (archivedError) {
      logger.error(
        "Error adding 'archived' column to StudentPosts table:",
        archivedError.message,
      );
    }

    const tablesToMigrate = [
      { table: "Teachers", columns: ["id"] },
      { table: "Students", columns: ["id"] },
      { table: "TeacherPosts", columns: ["id", "teacherId"] },
      { table: "StudentPosts", columns: ["id", "studentId"] },
      {
        table: "ConnectionRequests",
        columns: ["id", "studentId", "teacherId", "postId"],
      },
      {
        table: "TeacherPurchases",
        columns: ["id", "studentPostId", "teacherId", "studentId"],
      },
      { table: "AdminUsers", columns: ["id"] },
      { table: "PostReviews", columns: ["id", "postId", "studentId"] },
      { table: "findtitor_premium_student", columns: ["id"] },
      { table: "findtutor_premium_teachers", columns: ["id"] },
      { table: "findtutor_subcriptions", columns: ["id"] },
    ];

    for (const { table, columns } of tablesToMigrate) {
      for (const column of columns) {
        try {
          await connection.query(`
            ALTER TABLE ${table} 
            MODIFY COLUMN ${column} VARCHAR(50)
          `);
          logger.info(`Migrated ${table}.${column} to VARCHAR(50)`);
        } catch (migrateError) {
          logger.warn(
            `Migration failed for ${table}.${column}:`,
            migrateError.message,
          );
          // This is okay if the table doesn't exist yet or column is already correct size
        }
      }
    }

    // Teacher Posts Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TeacherPosts (
        id VARCHAR(50) PRIMARY KEY,
        teacherId VARCHAR(50) NOT NULL,
        headline VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        description TEXT,
        lessonType ENUM('in-person', 'online', 'both') DEFAULT 'in-person',
        distanceFromLocation INT DEFAULT 5,
        townOrDistrict VARCHAR(255),
        price DECIMAL(10,2) NOT NULL,
        priceType ENUM('hourly', 'daily', 'weekly', 'monthly') DEFAULT 'hourly',
        archived BOOLEAN DEFAULT FALSE,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_teacher_posts_teacher (teacherId),
        INDEX idx_teacher_posts_subject (subject),
        INDEX idx_teacher_posts_location (location),
        INDEX idx_teacher_posts_archived (archived)
      )
    `);
    logger.info("Table TeacherPosts created");

    // Students Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Students (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(50),
        cityOrTown VARCHAR(255),
        country VARCHAR(255),
        profilePhoto TEXT,
        hasPremium TINYINT(1) DEFAULT 0,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_email (email),
        INDEX idx_student_name (name)
      )
    `);
    logger.info("Table Students created");

    try {
      const [studentColumns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Students' AND COLUMN_NAME = 'hasPremium'`,
        [process.env.DB_NAME],
      );

      if (studentColumns.length === 0) {
        await connection.query(
          `ALTER TABLE Students ADD COLUMN hasPremium TINYINT(1) DEFAULT 0`,
        );
        logger.info("Added hasPremium column to Students table");
      }
    } catch (studentColumnError) {
      logger.error(
        "Error ensuring hasPremium column exists in Students table:",
        studentColumnError.message,
      );
    }

    // Admins Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Admins (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        lastLogin TIMESTAMP NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin_email (email)
      )
    `);
    logger.info("Table Admins created");

    // OTP Verifications Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS OTPVerifications (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        userType ENUM('student', 'teacher') NOT NULL,
        phoneNumber VARCHAR(50) NOT NULL,
        otpCode VARCHAR(6) NOT NULL,
        isVerified TINYINT(1) DEFAULT 0,
        expiresAt TIMESTAMP NOT NULL,
        lastSentAt TIMESTAMP NULL,
        attempts INT DEFAULT 0,
        maxAttempts INT DEFAULT 5,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_phone (userId, phoneNumber),
        INDEX idx_otp_code (otpCode),
        INDEX idx_expires (expiresAt)
      )
    `);
    logger.info("Table OTPVerifications created");

    // Create default admin if it doesn't exist
    try {
      const bcrypt = require("bcrypt");
      const adminEmail = "admin@school.com";
      const adminPassword = "admin123";
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminId = await generateId();

      // Check if admin already exists
      const [existing] = await connection.query(
        "SELECT * FROM Admins WHERE email = ?",
        [adminEmail],
      );

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO Admins (id, name, email, password, role) 
           VALUES (?, 'Super Administrator', ?, ?, 'admin')`,
          [adminId, adminEmail, hashedPassword],
        );
        logger.info("Default admin created:", adminEmail);
      } else {
        logger.info("Default admin already exists");
      }
    } catch (adminError) {
      logger.warn("Error creating default admin:", adminError.message);
    }

    // Student Posts Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS StudentPosts (
        id VARCHAR(50) PRIMARY KEY,
        studentId VARCHAR(50) NOT NULL,
        lessonType ENUM('online', 'in-person', 'both') NOT NULL,
        subject VARCHAR(255) NOT NULL,
        headline VARCHAR(255) NOT NULL,
        description TEXT,
        townOrCity VARCHAR(255),
        grade ENUM('student', 'university-student', 'adult') DEFAULT 'student',
        archived BOOLEAN DEFAULT FALSE,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_posts_student (studentId),
        INDEX idx_student_posts_subject (subject),
        INDEX idx_student_posts_lesson_type (lessonType),
        INDEX idx_student_posts_archived (archived),
        FOREIGN KEY (studentId) REFERENCES Students(id) ON DELETE CASCADE
      )
    `);
    logger.info("Table StudentPosts created");

    // Connection Requests Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ConnectionRequests (
        id VARCHAR(50) PRIMARY KEY,
        studentId VARCHAR(50) NOT NULL,
        teacherId VARCHAR(50) NOT NULL,
        postId VARCHAR(50) NOT NULL,
        message TEXT,
        status ENUM('pending', 'purchased', 'rejected') DEFAULT 'pending',
        requestDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        purchaseDate TIMESTAMP NULL,
        paymentAmount DECIMAL(10,2) DEFAULT 6.00,
        paymentStatus ENUM('unpaid', 'paid') DEFAULT 'unpaid',
        contactRevealed BOOLEAN DEFAULT FALSE,
        stripeSessionId VARCHAR(255) NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_student_post_request (studentId, postId),
        INDEX idx_teacher_requests (teacherId, status),
        INDEX idx_student_requests (studentId),
        INDEX idx_post_requests (postId),
        FOREIGN KEY (studentId) REFERENCES Students(id) ON DELETE CASCADE,
        FOREIGN KEY (teacherId) REFERENCES Teachers(id) ON DELETE CASCADE
      )
    `);
    logger.info("Table ConnectionRequests created");

    // Teacher Purchases Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TeacherPurchases (
        id VARCHAR(50) PRIMARY KEY,
        studentPostId VARCHAR(50) NOT NULL,
        teacherId VARCHAR(50) NOT NULL,
        studentId VARCHAR(50) NOT NULL,
        paymentAmount DECIMAL(10,2) NOT NULL,
        paymentStatus ENUM('paid', 'pending', 'failed') DEFAULT 'pending',
        phoneNumberAccess BOOLEAN DEFAULT FALSE,
        purchasedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        stripeSessionId VARCHAR(255) NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_teacher_purchase (teacherId, studentPostId),
        INDEX idx_student_post_purchases (studentPostId),
        INDEX idx_student_purchases (studentId),
        FOREIGN KEY (studentPostId) REFERENCES StudentPosts(id) ON DELETE CASCADE,
        FOREIGN KEY (teacherId) REFERENCES Teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES Students(id) ON DELETE CASCADE
      )
    `);
    logger.info("Table TeacherPurchases created");

    // Admin Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS AdminUsers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'super_admin') DEFAULT 'admin',
        lastLogin TIMESTAMP NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin_email (email),
        INDEX idx_admin_role (role)
      )
    `);
    logger.info("Table AdminUsers created");

    // Post Reviews Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS PostReviews (
        id VARCHAR(50) PRIMARY KEY,
        postId VARCHAR(50) NOT NULL,
        studentId VARCHAR(50) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        reviewText TEXT,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_student_post_review (studentId, postId),
        INDEX idx_post_reviews (postId),
        FOREIGN KEY (postId) REFERENCES TeacherPosts(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES Students(id) ON DELETE CASCADE
      )
    `);
    logger.info("Table PostReviews created");

    // Tutor Reviews Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TutorReviews (
        id VARCHAR(50) PRIMARY KEY,
        teacherId VARCHAR(50) NOT NULL,
        studentId VARCHAR(50) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        reviewText TEXT,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_student_teacher_review (studentId, teacherId),
        INDEX idx_teacher_reviews (teacherId),
        FOREIGN KEY (teacherId) REFERENCES Teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES Students(id) ON DELETE CASCADE
      )
    `);
    logger.info("Table TutorReviews created");

    // Create the ID generation function
    try {
      // First, check if the function already exists
      const [existingFunctions] = await connection.query(`
        SELECT ROUTINE_NAME 
        FROM information_schema.ROUTINES 
        WHERE ROUTINE_TYPE = 'FUNCTION' 
        AND ROUTINE_NAME = 'generate_pocketbase_id'
        AND ROUTINE_SCHEMA = DATABASE()
      `);

      if (existingFunctions.length === 0) {
        // Try to create the function, but handle privilege errors gracefully
        try {
          // Drop the function if it exists (in case of syntax issues)
          await connection.query(
            `DROP FUNCTION IF EXISTS generate_pocketbase_id`,
          );

          // Create the function without DELIMITER
          await connection.query(`
            CREATE FUNCTION generate_pocketbase_id() 
            RETURNS VARCHAR(50)
            READS SQL DATA
            DETERMINISTIC
            BEGIN
                DECLARE chars VARCHAR(36) DEFAULT 'abcdefghijklmnopqrstuvwxyz0123456789';
                DECLARE result VARCHAR(50) DEFAULT '';
                DECLARE i INT DEFAULT 0;
                
                WHILE i < 20 DO
                    SET result = CONCAT(result, SUBSTRING(chars, FLOOR(1 + RAND() * 36), 1));
                    SET i = i + 1;
                END WHILE;
                
                RETURN result;
            END
          `);
          logger.info("Function generate_pocketbase_id created");
        } catch (createError) {
          if (createError.code === "ER_BINLOG_CREATE_ROUTINE_NEED_SUPER") {
            logger.warn(
              "Cannot create MySQL function due to insufficient privileges (SUPER privilege required)",
            );
            logger.info(
              "The application will use JavaScript fallback for ID generation",
            );
          } else {
            throw createError;
          }
        }
      } else {
        logger.info("Function generate_pocketbase_id already exists");
      }
    } catch (funcError) {
      logger.warn(
        "Function creation skipped (may already exist or insufficient privileges)",
      );
      logger.error("Function error details:", funcError);
    }

    // Insert some sample data for testing (optional)
    if (process.argv.includes("--sample-data")) {
      logger.info("Inserting sample data...");

      // Generate IDs first
      const studentId = await generateId();
      const teacherId = await generateId();
      const subId = await generateId();

      // Sample student premium record
      await connection.query(
        `
        INSERT IGNORE INTO findtitor_premium_student 
        (id, subject, email, mobile, topix, descripton, ispayed)
        VALUES 
        (?, 'Mathematics', 'student@example.com', '+1234567890', 'Algebra, Calculus', 'Need help with advanced math topics', true)`,
        [studentId],
      );

      // Sample teacher premium record
      await connection.query(
        `
        INSERT IGNORE INTO findtutor_premium_teachers 
        (id, link_or_video, link1, link2, link3, ispaid, mail)
        VALUES 
        (?, true, 'https://youtube.com/watch?v=example1', 'https://youtube.com/watch?v=example2', '', true, 'teacher@example.com')`,
        [teacherId],
      );

      // Sample subscription
      await connection.query(
        `
        INSERT IGNORE INTO findtutor_subcriptions 
        (id, field)
        VALUES 
        (?, 'subscriber@example.com')`,
        [subId],
      );

      logger.info("Sample data inserted");
    }

    logger.info("Database setup completed successfully!");
  } catch (error) {
    logger.error("Error setting up database:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = {
  setupDatabase,
};
