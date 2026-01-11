-- ============================================
-- Dummy Data for Main Tables
-- ============================================
-- This file contains INSERT statements for:
-- - Teachers (25 records)
-- - Students (25 records)
-- - TeacherPosts (25 records)
-- - StudentPosts (25 records)
--
-- Usage:
--   mysql -u your_username -p your_database_name < dummy_data_main_tables.sql
--   OR execute in your MySQL client
--
-- Note: Passwords are hashed with bcrypt for "password123"
--       You can update passwords later if needed
-- ============================================

-- ============================================
-- TEACHERS (25 records)
-- ============================================
-- Status distribution: 18 approved, 5 pending, 2 rejected
-- Password hash for all: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy (password123)

INSERT INTO Teachers (id, name, email, password, phoneNumber, cityOrTown, country, profilePhoto, status, created, updated) VALUES
('teacher_001', 'John Smith', 'john.smith@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0101', 'New York', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_002', 'Sarah Johnson', 'sarah.johnson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0102', 'Los Angeles', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_003', 'Michael Brown', 'michael.brown@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0103', 'Chicago', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_004', 'Emily Davis', 'emily.davis@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0104', 'Houston', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_005', 'David Wilson', 'david.wilson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0105', 'Phoenix', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_006', 'Jessica Martinez', 'jessica.martinez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0106', 'Philadelphia', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_007', 'Robert Anderson', 'robert.anderson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0107', 'San Antonio', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_008', 'Amanda Taylor', 'amanda.taylor@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0108', 'San Diego', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_009', 'James Thomas', 'james.thomas@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0109', 'Dallas', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_010', 'Lisa Jackson', 'lisa.jackson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0110', 'San Jose', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_011', 'Christopher White', 'christopher.white@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0111', 'Austin', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_012', 'Michelle Harris', 'michelle.harris@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0112', 'Jacksonville', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_013', 'Daniel Martin', 'daniel.martin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0113', 'Fort Worth', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_014', 'Ashley Thompson', 'ashley.thompson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0114', 'Columbus', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_015', 'Matthew Garcia', 'matthew.garcia@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0115', 'Charlotte', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_016', 'Stephanie Martinez', 'stephanie.martinez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0116', 'San Francisco', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_017', 'Andrew Robinson', 'andrew.robinson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0117', 'Indianapolis', 'USA', NULL, 'approved', NOW(), NOW()),
('teacher_018', 'Nicole Clark', 'nicole.clark@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0118', 'Seattle', 'USA', 'https://via.placeholder.com/150', 'approved', NOW(), NOW()),
('teacher_019', 'Ryan Rodriguez', 'ryan.rodriguez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0119', 'Denver', 'USA', NULL, 'pending', NOW(), NOW()),
('teacher_020', 'Lauren Lewis', 'lauren.lewis@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0120', 'Washington', 'USA', 'https://via.placeholder.com/150', 'pending', NOW(), NOW()),
('teacher_021', 'Kevin Lee', 'kevin.lee@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0121', 'Boston', 'USA', NULL, 'pending', NOW(), NOW()),
('teacher_022', 'Rachel Walker', 'rachel.walker@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0122', 'El Paso', 'USA', 'https://via.placeholder.com/150', 'pending', NOW(), NOW()),
('teacher_023', 'Brandon Hall', 'brandon.hall@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0123', 'Detroit', 'USA', NULL, 'pending', NOW(), NOW()),
('teacher_024', 'Samantha Young', 'samantha.young@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0124', 'London', 'UK', 'https://via.placeholder.com/150', 'rejected', NOW(), NOW()),
('teacher_025', 'Justin King', 'justin.king@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0125', 'Toronto', 'Canada', NULL, 'rejected', NOW(), NOW());

-- ============================================
-- STUDENTS (25 records)
-- ============================================
-- Grade distribution: Mix of student, university-student, and adult

INSERT INTO Students (id, name, email, password, phoneNumber, cityOrTown, country, profilePhoto, hasPremium, created, updated) VALUES
('student_001', 'Emma Williams', 'emma.williams@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0201', 'New York', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_002', 'Noah Jones', 'noah.jones@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0202', 'Los Angeles', 'USA', NULL, 0, NOW(), NOW()),
('student_003', 'Olivia Brown', 'olivia.brown@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0203', 'Chicago', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_004', 'Liam Garcia', 'liam.garcia@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0204', 'Houston', 'USA', NULL, 0, NOW(), NOW()),
('student_005', 'Ava Miller', 'ava.miller@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0205', 'Phoenix', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_006', 'William Davis', 'william.davis@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0206', 'Philadelphia', 'USA', NULL, 0, NOW(), NOW()),
('student_007', 'Sophia Rodriguez', 'sophia.rodriguez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0207', 'San Antonio', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_008', 'Mason Martinez', 'mason.martinez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0208', 'San Diego', 'USA', NULL, 0, NOW(), NOW()),
('student_009', 'Isabella Lopez', 'isabella.lopez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0209', 'Dallas', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_010', 'Ethan Wilson', 'ethan.wilson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0210', 'San Jose', 'USA', NULL, 0, NOW(), NOW()),
('student_011', 'Mia Anderson', 'mia.anderson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0211', 'Austin', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_012', 'James Taylor', 'james.taylor@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0212', 'Jacksonville', 'USA', NULL, 0, NOW(), NOW()),
('student_013', 'Charlotte Thomas', 'charlotte.thomas@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0213', 'Fort Worth', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_014', 'Benjamin Jackson', 'benjamin.jackson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0214', 'Columbus', 'USA', NULL, 0, NOW(), NOW()),
('student_015', 'Amelia White', 'amelia.white@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0215', 'Charlotte', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_016', 'Lucas Harris', 'lucas.harris@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0216', 'San Francisco', 'USA', NULL, 0, NOW(), NOW()),
('student_017', 'Harper Martin', 'harper.martin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0217', 'Indianapolis', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_018', 'Henry Thompson', 'henry.thompson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0218', 'Seattle', 'USA', NULL, 0, NOW(), NOW()),
('student_019', 'Evelyn Garcia', 'evelyn.garcia@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0219', 'Denver', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_020', 'Alexander Martinez', 'alexander.martinez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0220', 'Washington', 'USA', NULL, 0, NOW(), NOW()),
('student_021', 'Abigail Robinson', 'abigail.robinson@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0221', 'Boston', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_022', 'Sebastian Clark', 'sebastian.clark@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0222', 'El Paso', 'USA', NULL, 0, NOW(), NOW()),
('student_023', 'Emily Rodriguez', 'emily.rodriguez@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0223', 'Detroit', 'USA', 'https://via.placeholder.com/150', 0, NOW(), NOW()),
('student_024', 'Michael Lewis', 'michael.lewis@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0224', 'London', 'UK', NULL, 0, NOW(), NOW()),
('student_025', 'Madison Walker', 'madison.walker@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0225', 'Toronto', 'Canada', 'https://via.placeholder.com/150', 0, NOW(), NOW());

-- ============================================
-- TEACHER POSTS (25 records)
-- ============================================
-- Distributed across approved teachers (teacher_001 to teacher_018)
-- Various subjects, lesson types, and prices

INSERT INTO TeacherPosts (id, teacherId, headline, subject, location, description, lessonType, distanceFromLocation, townOrDistrict, price, priceType, created, updated) VALUES
('tpost_001', 'teacher_001', 'Expert Mathematics Tutor - Algebra & Calculus', 'Mathematics', 'New York, NY', 'Experienced mathematics tutor with 10+ years teaching Algebra, Geometry, and Calculus. Specializing in high school and college-level mathematics. Flexible scheduling available.', 'online', 0, NULL, 35.00, 'hourly', NOW(), NOW()),
('tpost_002', 'teacher_001', 'Advanced Mathematics - AP Calculus Prep', 'Mathematics', 'New York, NY', 'Comprehensive AP Calculus preparation. Covering limits, derivatives, integrals, and applications. Practice tests and exam strategies included.', 'in-person', 5, 'Manhattan', 45.00, 'hourly', NOW(), NOW()),
('tpost_003', 'teacher_002', 'Physics Tutor - Mechanics & Thermodynamics', 'Physics', 'Los Angeles, CA', 'Professional physics tutor specializing in mechanics, thermodynamics, and electromagnetism. Available for high school and college students.', 'both', 10, 'Downtown LA', 40.00, 'hourly', NOW(), NOW()),
('tpost_004', 'teacher_003', 'Chemistry Tutoring - General & Organic', 'Chemistry', 'Chicago, IL', 'PhD in Chemistry offering tutoring in General Chemistry and Organic Chemistry. Interactive sessions with problem-solving focus.', 'online', 0, NULL, 50.00, 'hourly', NOW(), NOW()),
('tpost_005', 'teacher_004', 'English Language & Literature Tutor', 'English', 'Houston, TX', 'Certified English tutor with expertise in essay writing, grammar, literature analysis, and test preparation (SAT, ACT, IELTS, TOEFL).', 'both', 15, 'Houston Downtown', 38.00, 'hourly', NOW(), NOW()),
('tpost_006', 'teacher_005', 'Computer Science & Programming Tutor', 'Computer Science', 'Phoenix, AZ', 'Software engineer teaching Python, Java, JavaScript, C++, data structures, algorithms, and web development. Real-world project experience.', 'both', 20, 'Phoenix Metro', 55.00, 'hourly', NOW(), NOW()),
('tpost_007', 'teacher_006', 'Biology Tutor - AP Biology Preparation', 'Biology', 'Philadelphia, PA', 'Experienced biology tutor specializing in AP Biology, cell biology, genetics, and ecology. Interactive learning with visual aids.', 'in-person', 8, 'Center City', 42.00, 'hourly', NOW(), NOW()),
('tpost_008', 'teacher_007', 'History Tutor - World & US History', 'History', 'San Antonio, TX', 'History teacher with expertise in World History, US History, and European History. Help with essays, research papers, and exam prep.', 'online', 0, NULL, 32.00, 'hourly', NOW(), NOW()),
('tpost_009', 'teacher_008', 'Economics Tutor - Micro & Macro', 'Economics', 'San Diego, CA', 'Economics professor offering tutoring in Microeconomics, Macroeconomics, and Business Economics. Clear explanations of complex concepts.', 'both', 12, 'San Diego', 45.00, 'hourly', NOW(), NOW()),
('tpost_010', 'teacher_009', 'Statistics & Probability Tutor', 'Statistics', 'Dallas, TX', 'Statistics tutor helping with probability, hypothesis testing, regression analysis, and data interpretation. Suitable for all levels.', 'online', 0, NULL, 40.00, 'hourly', NOW(), NOW()),
('tpost_011', 'teacher_010', 'Spanish Language Tutor', 'Spanish', 'San Jose, CA', 'Native Spanish speaker offering language tutoring for beginners to advanced learners. Conversation practice, grammar, and cultural context.', 'both', 10, 'San Jose', 35.00, 'hourly', NOW(), NOW()),
('tpost_012', 'teacher_011', 'French Language Tutor', 'French', 'Austin, TX', 'Experienced French tutor with native-level proficiency. Teaching grammar, vocabulary, conversation, and French culture. All levels welcome.', 'online', 0, NULL, 38.00, 'hourly', NOW(), NOW()),
('tpost_013', 'teacher_012', 'Psychology Tutor - AP & College Level', 'Psychology', 'Jacksonville, FL', 'Psychology tutor specializing in AP Psychology and college-level courses. Covering cognitive, developmental, and social psychology.', 'in-person', 6, 'Jacksonville', 40.00, 'hourly', NOW(), NOW()),
('tpost_014', 'teacher_013', 'Geometry & Trigonometry Tutor', 'Mathematics', 'Fort Worth, TX', 'Mathematics tutor focusing on Geometry and Trigonometry. Clear explanations, step-by-step problem solving, and practice exercises.', 'both', 15, 'Fort Worth', 33.00, 'hourly', NOW(), NOW()),
('tpost_015', 'teacher_014', 'Chemistry Lab Tutor - Online Sessions', 'Chemistry', 'Columbus, OH', 'Chemistry tutor offering online lab sessions and theoretical explanations. Help with lab reports, calculations, and understanding reactions.', 'online', 0, NULL, 48.00, 'hourly', NOW(), NOW()),
('tpost_016', 'teacher_015', 'English Writing & Composition Tutor', 'English', 'Charlotte, NC', 'Writing tutor helping with essays, research papers, creative writing, and academic composition. Focus on structure, style, and clarity.', 'both', 10, 'Charlotte', 36.00, 'hourly', NOW(), NOW()),
('tpost_017', 'teacher_016', 'Physics - AP Physics 1 & 2 Prep', 'Physics', 'San Francisco, CA', 'AP Physics tutor covering mechanics, electricity, magnetism, and waves. Practice problems and exam strategies for AP exams.', 'in-person', 8, 'San Francisco', 50.00, 'hourly', NOW(), NOW()),
('tpost_018', 'teacher_017', 'Computer Programming - Python Basics', 'Computer Science', 'Indianapolis, IN', 'Python programming tutor for beginners. Learn variables, loops, functions, and object-oriented programming. Hands-on coding practice.', 'online', 0, NULL, 45.00, 'hourly', NOW(), NOW()),
('tpost_019', 'teacher_018', 'Mathematics - Pre-Algebra & Algebra 1', 'Mathematics', 'Seattle, WA', 'Patient mathematics tutor specializing in Pre-Algebra and Algebra 1. Building strong foundations for advanced math. Suitable for middle and high school.', 'both', 12, 'Seattle', 30.00, 'hourly', NOW(), NOW()),
('tpost_020', 'teacher_001', 'Calculus - Differential & Integral', 'Mathematics', 'New York, NY', 'Advanced calculus tutoring covering differential and integral calculus. Help with limits, derivatives, integrals, and applications.', 'online', 0, NULL, 48.00, 'hourly', NOW(), NOW()),
('tpost_021', 'teacher_002', 'Physics - Quantum Mechanics & Modern Physics', 'Physics', 'Los Angeles, CA', 'Advanced physics tutor covering quantum mechanics, relativity, and modern physics concepts. For college-level students.', 'in-person', 10, 'LA Metro', 55.00, 'hourly', NOW(), NOW()),
('tpost_022', 'teacher_003', 'Organic Chemistry - Reaction Mechanisms', 'Chemistry', 'Chicago, IL', 'Specialized organic chemistry tutor focusing on reaction mechanisms, stereochemistry, and synthesis. For college students.', 'both', 15, 'Chicago', 52.00, 'hourly', NOW(), NOW()),
('tpost_023', 'teacher_004', 'English Literature - Analysis & Essays', 'English', 'Houston, TX', 'Literature tutor helping with literary analysis, essay writing, and understanding themes, symbols, and literary devices.', 'online', 0, NULL, 40.00, 'hourly', NOW(), NOW()),
('tpost_024', 'teacher_005', 'Web Development - Full Stack', 'Computer Science', 'Phoenix, AZ', 'Full-stack web development tutor teaching HTML, CSS, JavaScript, React, Node.js, and database integration. Project-based learning.', 'both', 20, 'Phoenix', 60.00, 'hourly', NOW(), NOW()),
('tpost_025', 'teacher_006', 'Biology - Anatomy & Physiology', 'Biology', 'Philadelphia, PA', 'Biology tutor specializing in human anatomy and physiology. Visual learning with diagrams and interactive sessions.', 'in-person', 8, 'Philadelphia', 44.00, 'hourly', NOW(), NOW());

-- ============================================
-- STUDENT POSTS (25 records)
-- ============================================
-- Distributed across all students
-- Various subjects matching teacher posts, different lesson types and grades

INSERT INTO StudentPosts (id, studentId, lessonType, subject, headline, description, townOrCity, grade, created, updated) VALUES
('spost_001', 'student_001', 'online', 'Mathematics', 'Looking for Math Tutor - Algebra Help Needed', 'I am a high school student struggling with Algebra. I need help understanding quadratic equations, factoring, and solving word problems. Prefer online sessions due to my busy schedule.', 'New York, NY', 'student', NOW(), NOW()),
('spost_002', 'student_002', 'in-person', 'Physics', 'Need Physics Tutor for AP Exam Prep', 'I am preparing for my AP Physics exam and need help with mechanics and electricity. I prefer in-person tutoring sessions in the Los Angeles area. Available after school hours.', 'Los Angeles, CA', 'student', NOW(), NOW()),
('spost_003', 'student_003', 'both', 'English', 'English Tutor Needed - Essay Writing Help', 'I am a university student struggling with academic writing. I need help improving my essay structure, grammar, and argumentation skills. Flexible with online or in-person sessions.', 'Chicago, IL', 'university-student', NOW(), NOW()),
('spost_004', 'student_004', 'online', 'Chemistry', 'Online Chemistry Tutor Needed - Organic Chemistry', 'I am taking Organic Chemistry this semester and finding it challenging. I need help understanding reaction mechanisms, stereochemistry, and synthesis. Online sessions preferred.', 'Houston, TX', 'university-student', NOW(), NOW()),
('spost_005', 'student_005', 'both', 'Computer Science', 'Programming Tutor Needed - Python & Web Development', 'I am learning programming and need help with Python basics and web development (HTML, CSS, JavaScript). I am flexible with online or in-person sessions in the Phoenix area.', 'Phoenix, AZ', 'adult', NOW(), NOW()),
('spost_006', 'student_006', 'in-person', 'Biology', 'Biology Tutor Needed - AP Biology Prep', 'I am preparing for my AP Biology exam and need help with cell biology, genetics, and ecology. Prefer in-person sessions in the Philadelphia area.', 'Philadelphia, PA', 'student', NOW(), NOW()),
('spost_007', 'student_007', 'online', 'History', 'History Tutor Needed - World History Help', 'I need help understanding world history topics, especially European history and World Wars. Online sessions work best for me due to my schedule.', 'San Antonio, TX', 'student', NOW(), NOW()),
('spost_008', 'student_008', 'both', 'Mathematics', 'Math Tutor Needed - Calculus Help', 'I am struggling with Calculus, specifically derivatives and integrals. I need a patient tutor who can explain concepts clearly. Flexible with lesson type.', 'San Diego, CA', 'university-student', NOW(), NOW()),
('spost_009', 'student_009', 'in-person', 'Physics', 'Physics Tutor - Mechanics Help', 'I need help with physics mechanics, especially Newton\'s laws and energy concepts. Prefer in-person sessions in Dallas for better understanding.', 'Dallas, TX', 'student', NOW(), NOW()),
('spost_010', 'student_010', 'online', 'English', 'English Writing Tutor - Research Paper Help', 'I need help writing a research paper for my university course. Looking for a tutor who can help with structure, citations, and academic writing style.', 'San Jose, CA', 'university-student', NOW(), NOW()),
('spost_011', 'student_011', 'both', 'Chemistry', 'Chemistry Tutor - General Chemistry Help', 'I am taking General Chemistry and struggling with stoichiometry and chemical equations. Need a tutor who can explain concepts clearly. Flexible with online or in-person.', 'Austin, TX', 'university-student', NOW(), NOW()),
('spost_012', 'student_012', 'online', 'Computer Science', 'Programming Tutor - JavaScript Help', 'I am learning JavaScript and need help with functions, arrays, and DOM manipulation. Online sessions work best for screen sharing and code review.', 'Jacksonville, FL', 'adult', NOW(), NOW()),
('spost_013', 'student_013', 'in-person', 'Mathematics', 'Math Tutor - Geometry Help', 'I need help with geometry, especially proofs and theorems. Prefer in-person sessions where I can work through problems with the tutor.', 'Fort Worth, TX', 'student', NOW(), NOW()),
('spost_014', 'student_014', 'both', 'Biology', 'Biology Tutor - Cell Biology Help', 'I am studying cell biology and need help understanding cell structure, organelles, and cellular processes. Flexible with lesson format.', 'Columbus, OH', 'university-student', NOW(), NOW()),
('spost_015', 'student_015', 'online', 'Economics', 'Economics Tutor Needed', 'I need help with microeconomics concepts, especially supply and demand, market structures, and elasticity. Online sessions preferred.', 'Charlotte, NC', 'university-student', NOW(), NOW()),
('spost_016', 'student_016', 'in-person', 'Spanish', 'Spanish Language Tutor Needed', 'I am learning Spanish and need help with grammar, vocabulary, and conversation practice. Prefer in-person sessions for better interaction.', 'San Francisco, CA', 'adult', NOW(), NOW()),
('spost_017', 'student_017', 'both', 'Mathematics', 'Math Tutor - Statistics Help', 'I need help with statistics, especially probability, hypothesis testing, and data analysis. Flexible with online or in-person sessions.', 'Indianapolis, IN', 'university-student', NOW(), NOW()),
('spost_018', 'student_018', 'online', 'Physics', 'Physics Tutor - Electricity & Magnetism', 'I am struggling with electricity and magnetism concepts in my physics course. Need a tutor who can explain clearly. Online sessions work best.', 'Seattle, WA', 'university-student', NOW(), NOW()),
('spost_019', 'student_019', 'in-person', 'English', 'English Literature Tutor Needed', 'I need help analyzing literature and writing literary essays. Looking for a tutor who can help with close reading and essay structure.', 'Denver, CO', 'student', NOW(), NOW()),
('spost_020', 'student_020', 'both', 'Computer Science', 'Programming Tutor - Data Structures', 'I am learning data structures and algorithms. Need help with arrays, linked lists, trees, and sorting algorithms. Flexible with lesson format.', 'Washington, DC', 'university-student', NOW(), NOW()),
('spost_021', 'student_021', 'online', 'Chemistry', 'Chemistry Tutor - Biochemistry Help', 'I need help with biochemistry, especially enzyme kinetics and metabolic pathways. Online sessions with screen sharing preferred.', 'Boston, MA', 'university-student', NOW(), NOW()),
('spost_022', 'student_022', 'in-person', 'Mathematics', 'Math Tutor - Pre-Algebra Help', 'I am in middle school and need help with pre-algebra concepts. Looking for a patient tutor who can explain things clearly. Prefer in-person sessions.', 'El Paso, TX', 'student', NOW(), NOW()),
('spost_023', 'student_023', 'both', 'Psychology', 'Psychology Tutor Needed', 'I am taking psychology and need help understanding different psychological theories and research methods. Flexible with online or in-person.', 'Detroit, MI', 'university-student', NOW(), NOW()),
('spost_024', 'student_024', 'online', 'French', 'French Language Tutor Needed', 'I am learning French and need help with grammar, pronunciation, and conversation. Online sessions with video calls work best for language practice.', 'London, UK', 'adult', NOW(), NOW()),
('spost_025', 'student_025', 'in-person', 'Biology', 'Biology Tutor - Genetics Help', 'I need help understanding genetics, especially Mendelian genetics, DNA structure, and gene expression. Prefer in-person sessions for better explanation.', 'Toronto, Canada', 'university-student', NOW(), NOW());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count records in each table
SELECT 'Teachers' as TableName, COUNT(*) as RecordCount FROM Teachers
UNION ALL
SELECT 'Students', COUNT(*) FROM Students
UNION ALL
SELECT 'TeacherPosts', COUNT(*) FROM TeacherPosts
UNION ALL
SELECT 'StudentPosts', COUNT(*) FROM StudentPosts;

-- Check teacher status distribution
SELECT status, COUNT(*) as count FROM Teachers GROUP BY status;

-- Check student grade distribution
SELECT grade, COUNT(*) as count FROM StudentPosts GROUP BY grade;

-- Check lesson type distribution for teacher posts
SELECT lessonType, COUNT(*) as count FROM TeacherPosts GROUP BY lessonType;

-- Check lesson type distribution for student posts
SELECT lessonType, COUNT(*) as count FROM StudentPosts GROUP BY lessonType;

-- Check subject distribution for teacher posts
SELECT subject, COUNT(*) as count FROM TeacherPosts GROUP BY subject ORDER BY count DESC;

-- Check subject distribution for student posts
SELECT subject, COUNT(*) as count FROM StudentPosts GROUP BY subject ORDER BY count DESC;

-- Sample data preview
SELECT 'Recent Teachers' as Preview;
SELECT id, name, email, status FROM Teachers ORDER BY created DESC LIMIT 5;

SELECT 'Recent Students' as Preview;
SELECT id, name, email FROM Students ORDER BY created DESC LIMIT 5;

SELECT 'Recent Teacher Posts' as Preview;
SELECT id, teacherId, headline, subject, lessonType, price FROM TeacherPosts ORDER BY created DESC LIMIT 5;

SELECT 'Recent Student Posts' as Preview;
SELECT id, studentId, headline, subject, lessonType, grade FROM StudentPosts ORDER BY created DESC LIMIT 5;

