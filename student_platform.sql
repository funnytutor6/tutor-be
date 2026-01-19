-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 01, 2025 at 06:49 AM
-- Server version: 5.7.36
-- PHP Version: 7.4.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `student_platform`
--

-- --------------------------------------------------------

--
-- Table structure for table `connectionrequests`
--

DROP TABLE IF EXISTS `connectionrequests`;
CREATE TABLE IF NOT EXISTS `connectionrequests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `studentId` int(11) NOT NULL,
  `teacherId` int(11) NOT NULL,
  `postId` int(11) NOT NULL,
  `message` text,
  `status` enum('pending','purchased','rejected') DEFAULT 'pending',
  `requestDate` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `purchaseDate` timestamp NULL DEFAULT NULL,
  `paymentAmount` decimal(10,2) DEFAULT '6.00',
  `paymentStatus` enum('unpaid','paid') DEFAULT 'unpaid',
  `contactRevealed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_post_request` (`studentId`,`postId`),
  KEY `idx_teacher_requests` (`teacherId`,`status`),
  KEY `idx_student_requests` (`studentId`),
  KEY `idx_post_requests` (`postId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `postreviews`
--

DROP TABLE IF EXISTS `postreviews`;
CREATE TABLE IF NOT EXISTS `postreviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `postId` int(11) NOT NULL,
  `studentId` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `reviewText` text,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_post_review` (`studentId`,`postId`),
  KEY `postId` (`postId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `studentpost`
--

DROP TABLE IF EXISTS `studentpost`;
CREATE TABLE IF NOT EXISTS `studentpost` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `studentId` int(11) NOT NULL,
  `lessonType` enum('online','in-person','both') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `headline` varchar(255) NOT NULL,
  `description` text,
  `townOrCity` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `studentId` (`studentId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `studentprofile`
--

DROP TABLE IF EXISTS `studentprofile`;
CREATE TABLE IF NOT EXISTS `studentprofile` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phoneNumber` varchar(20) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `profilePhoto` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `studentrequests`
--

DROP TABLE IF EXISTS `studentrequests`;
CREATE TABLE IF NOT EXISTS `studentrequests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `postId` int(11) NOT NULL,
  `studentId` int(11) NOT NULL,
  `teacherId` int(11) NOT NULL,
  `rating` int(11) DEFAULT NULL,
  `reviewText` text,
  `payed` tinyint(1) DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_post` (`studentId`,`postId`),
  KEY `postId` (`postId`),
  KEY `teacherId` (`teacherId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `teacherpurchases`
--

DROP TABLE IF EXISTS `teacherpurchases`;
CREATE TABLE IF NOT EXISTS `teacherpurchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `studentPostId` int(11) NOT NULL,
  `teacherId` int(11) NOT NULL,
  `studentId` int(11) NOT NULL,
  `paymentAmount` decimal(10,2) NOT NULL,
  `paymentStatus` enum('paid','pending','failed') DEFAULT 'pending',
  `phoneNumberAccess` tinyint(1) DEFAULT '0',
  `purchasedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_teacher_purchase` (`teacherId`,`studentPostId`),
  KEY `studentPostId` (`studentPostId`),
  KEY `studentId` (`studentId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

DROP TABLE IF EXISTS `teachers`;
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `profilePhoto` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phoneNumber` varchar(20) DEFAULT NULL,
  `cityOrTown` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `teachersposts`
--

DROP TABLE IF EXISTS `teachersposts`;
CREATE TABLE IF NOT EXISTS `teachersposts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacherId` int(11) NOT NULL,
  `headline` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text,
  `lessonType` enum('in-person','online','both') NOT NULL,
  `distanceFromLocation` decimal(5,2) DEFAULT NULL,
  `townOrDistrict` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `priceType` enum('hourly','monthly','daily') NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `teacherId` (`teacherId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
