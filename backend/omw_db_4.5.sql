-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: omw_db
-- ------------------------------------------------------
-- Server version	8.0.34

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_transaction_logs`
--

use omw_db;

DROP TABLE IF EXISTS `admin_transaction_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_transaction_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `transaction_type` enum('settlement_approval','withdrawal_approval','charge_adjustment','wallet_adjustment') NOT NULL,
  `target_worker_id` int DEFAULT NULL,
  `target_provider_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `description` text,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `target_provider_id` (`target_provider_id`),
  KEY `idx_admin_logs_admin` (`admin_id`),
  KEY `idx_admin_logs_type` (`transaction_type`),
  KEY `idx_admin_logs_target` (`target_worker_id`),
  KEY `idx_admin_logs_created` (`created_at`),
  CONSTRAINT `admin_transaction_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admin_transaction_logs_ibfk_2` FOREIGN KEY (`target_worker_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admin_transaction_logs_ibfk_3` FOREIGN KEY (`target_provider_id`) REFERENCES `providers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_transaction_logs`
--

LOCK TABLES `admin_transaction_logs` WRITE;
/*!40000 ALTER TABLE `admin_transaction_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_transaction_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_requests`
--

DROP TABLE IF EXISTS `booking_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','timeout') DEFAULT 'pending',
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `booking_requests_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_requests_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_requests`
--

LOCK TABLES `booking_requests` WRITE;
/*!40000 ALTER TABLE `booking_requests` DISABLE KEYS */;
INSERT INTO `booking_requests` VALUES (25,50,1,'pending','2025-08-20 05:31:22',NULL),(26,50,2,'pending','2025-08-20 05:31:22',NULL),(27,50,3,'pending','2025-08-20 05:31:22',NULL),(28,51,1,'rejected','2025-08-20 05:41:05','2025-08-20 11:58:53'),(29,51,2,'accepted','2025-08-20 05:41:05','2025-08-20 11:58:53'),(30,51,3,'rejected','2025-08-20 05:41:05','2025-08-20 11:58:53'),(31,52,2,'pending','2025-08-21 03:36:25',NULL),(32,53,2,'pending','2025-08-21 10:03:31',NULL),(33,53,3,'pending','2025-08-21 10:03:31',NULL),(34,54,2,'accepted','2025-08-21 04:36:06','2025-08-26 06:16:48'),(35,55,2,'accepted','2025-08-21 04:59:07','2025-08-26 05:47:37'),(36,56,2,'accepted','2025-08-21 05:02:57','2025-08-21 10:42:15'),(37,57,1,'rejected','2025-08-26 01:33:17','2025-08-26 07:03:31'),(38,57,2,'accepted','2025-08-26 01:33:17','2025-08-26 07:03:31'),(39,57,3,'rejected','2025-08-26 01:33:17','2025-08-26 07:03:31'),(40,58,2,'rejected','2025-08-26 01:38:01','2025-08-26 08:07:13'),(41,59,2,'rejected','2025-08-26 02:25:31','2025-08-26 08:07:49'),(42,60,2,'accepted','2025-09-10 04:59:08','2025-09-14 08:45:06'),(43,61,2,'accepted','2025-09-10 05:14:01','2025-09-10 10:48:23'),(44,62,2,'accepted','2025-09-10 11:14:06','2025-09-10 11:19:05'),(45,62,3,'rejected','2025-09-10 11:14:06','2025-09-10 11:19:05'),(46,63,2,'rejected','2025-09-10 11:37:26','2025-09-14 08:45:09'),(47,63,3,'pending','2025-09-10 11:37:26','2025-09-14 08:44:59'),(48,64,5,'pending','2025-09-12 03:38:32',NULL),(49,65,5,'pending','2025-09-14 03:17:08',NULL),(50,66,2,'accepted','2025-09-14 03:19:27','2025-09-14 09:10:57'),(51,67,2,'accepted','2025-09-14 03:30:01','2025-09-14 09:10:55'),(52,69,2,'pending','2025-09-14 03:43:32',NULL),(53,71,2,'pending','2025-09-18 23:55:01',NULL),(54,72,5,'pending','2025-09-21 02:24:09',NULL),(55,73,2,'pending','2025-09-21 02:25:13',NULL),(56,74,2,'pending','2025-09-21 02:26:10',NULL),(57,87,2,'accepted','2025-09-21 04:37:04','2025-09-21 10:07:22'),(58,89,2,'pending','2025-09-21 22:55:50',NULL),(59,90,2,'accepted','2025-09-21 22:56:09','2025-09-22 04:26:28'),(60,91,2,'accepted','2025-09-21 23:13:13','2025-09-22 04:43:19'),(61,94,4,'accepted','2025-09-24 11:47:07','2025-09-24 11:47:32'),(62,95,4,'accepted','2025-09-24 16:16:51','2025-09-27 16:21:03'),(63,96,4,'accepted','2025-09-28 03:33:32','2025-09-28 03:33:50');
/*!40000 ALTER TABLE `booking_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `provider_id` int DEFAULT NULL,
  `booking_type` enum('ride','service') NOT NULL DEFAULT 'service',
  `subcategory_id` int DEFAULT NULL,
  `scheduled_time` datetime DEFAULT NULL,
  `gst` int DEFAULT NULL,
  `estimated_cost` int DEFAULT NULL,
  `actual_cost` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `service_status` varchar(20) DEFAULT NULL,
  `payment_status` varchar(20) DEFAULT 'unpaid',
  `upi_payment_method_id` int DEFAULT NULL,
  `cash_payment_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `duration` int DEFAULT NULL,
  `cost_type` enum('per_hour','per_day') DEFAULT NULL,
  `address` text,
  `notes` text,
  `otp_code` varchar(10) DEFAULT NULL,
  `otp_expires_at` datetime DEFAULT NULL COMMENT 'Expiration timestamp for OTP codes sent via email',
  `service_started_at` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `customer_id` int DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT NULL,
  `review` text,
  `rating_submitted_at` timestamp NULL DEFAULT NULL,
  `wallet_transaction_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `provider_id` (`provider_id`),
  KEY `subcategory_id` (`subcategory_id`),
  KEY `upi_payment_method_id` (`upi_payment_method_id`),
  KEY `cash_payment_id` (`cash_payment_id`),
  KEY `idx_bookings_customer_id` (`customer_id`),
  KEY `idx_bookings_updated_at` (`updated_at`),
  KEY `idx_bookings_rating` (`rating`),
  KEY `idx_bookings_rating_submitted` (`rating_submitted_at`),
  KEY `idx_bookings_otp_expires` (`otp_expires_at`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`),
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`),
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`upi_payment_method_id`) REFERENCES `upi_payment_methods` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bookings_ibfk_5` FOREIGN KEY (`cash_payment_id`) REFERENCES `cash_payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_rating_range` CHECK (((`rating` is null) or ((`rating` >= 1) and (`rating` <= 5))))
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,5,NULL,'service',29,'2025-08-05 08:00:00',360,NULL,NULL,2360,'cancelled','refunded',NULL,NULL,'2025-07-31 04:37:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(2,5,NULL,'ride',NULL,'2025-08-01 19:44:00',NULL,1500,NULL,NULL,'pending','pending',NULL,NULL,'2025-08-01 13:09:19',3,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(3,5,NULL,'ride',NULL,'2025-08-02 09:33:00',NULL,2500,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-01 13:11:33',5,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(4,5,NULL,'ride',NULL,'2025-08-02 09:00:00',NULL,2500,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-01 13:22:08',5,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(5,5,NULL,'ride',NULL,'2025-08-02 09:00:00',NULL,2500,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-01 13:51:21',5,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(6,5,2,'ride',NULL,'2025-08-02 09:00:00',NULL,3000,NULL,NULL,'assigned','pending',NULL,NULL,'2025-08-01 14:20:38',6,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(7,5,NULL,'service',65,'2025-08-02 10:00:00',90,NULL,NULL,590,'cancelled','refunded',NULL,NULL,'2025-08-01 15:38:23',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(8,5,NULL,'ride',NULL,'2025-08-02 05:00:00',NULL,6000,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-01 15:40:55',12,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(9,5,NULL,'ride',NULL,'2025-08-02 10:00:00',NULL,30000,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-01 15:44:02',60,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(10,5,NULL,'ride',NULL,'2025-08-02 01:20:00',NULL,5000,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-01 15:48:48',10,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(11,5,4,'ride',NULL,'2025-08-02 22:22:00',NULL,5000,NULL,NULL,'assigned','pending',NULL,NULL,'2025-08-01 15:50:11',10,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(12,5,NULL,'ride',NULL,'2025-08-03 09:58:00',NULL,6000,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-02 04:28:45',12,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(13,5,2,'ride',NULL,'2025-08-04 10:10:00',NULL,5000,NULL,NULL,'assigned','pending',NULL,NULL,'2025-08-02 04:41:07',10,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(14,5,NULL,'ride',NULL,'2025-08-03 10:11:00',NULL,5000,NULL,NULL,'pending','pending',NULL,NULL,'2025-08-02 04:41:46',10,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(15,5,NULL,'ride',NULL,'2025-08-02 10:12:00',NULL,5000,NULL,NULL,'pending','pending',NULL,NULL,'2025-08-02 04:42:34',10,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(16,5,NULL,'ride',NULL,'2025-08-02 10:13:00',NULL,3000,NULL,NULL,'pending','pending',NULL,NULL,'2025-08-02 04:43:19',6,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(17,5,2,'ride',NULL,'2025-08-02 10:14:00',NULL,2500,NULL,NULL,'assigned','pending',NULL,NULL,'2025-08-02 04:44:18',5,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(18,5,NULL,'service',32,'2025-08-03 10:00:00',1440,NULL,NULL,9440,'pending','pending',NULL,NULL,'2025-08-02 05:02:25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(19,5,NULL,'service',32,'2025-08-03 11:00:00',720,NULL,NULL,4720,'pending','pending',NULL,NULL,'2025-08-02 05:09:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(20,5,5,'service',32,'2025-08-07 16:00:00',720,NULL,NULL,4720,'assigned','pending',NULL,NULL,'2025-08-02 05:10:23',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(21,5,NULL,'service',64,'2025-08-08 13:00:00',450,NULL,NULL,2950,'pending','pending',NULL,NULL,'2025-08-02 05:10:48',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(22,5,NULL,'service',32,'2025-08-08 12:00:00',720,NULL,NULL,4720,'pending','pending',NULL,NULL,'2025-08-02 06:03:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(23,5,NULL,'service',32,'2025-08-05 13:00:00',720,NULL,NULL,4720,'pending','pending',NULL,NULL,'2025-08-02 06:04:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(24,5,5,'service',33,'2025-08-03 11:00:00',1080,NULL,NULL,7080,'assigned','pending',NULL,NULL,'2025-08-02 12:47:02',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(25,5,2,'ride',NULL,'2025-08-03 21:23:00',NULL,2000,NULL,NULL,'assigned','pending',NULL,NULL,'2025-08-02 12:50:48',4,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(26,5,NULL,'service',30,'2025-08-03 10:00:00',540,NULL,NULL,3540,'pending','pending',NULL,NULL,'2025-08-02 13:10:37',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(27,5,NULL,'service',32,'2025-08-03 10:00:00',720,NULL,NULL,4720,'pending','pending',NULL,NULL,'2025-08-02 13:10:37',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(28,5,NULL,'service',33,'2025-08-03 10:00:00',1080,NULL,NULL,7080,'pending','pending',NULL,NULL,'2025-08-02 13:10:37',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(29,5,6,'service',30,'2025-08-03 10:00:00',540,NULL,NULL,3540,'assigned','pending',NULL,NULL,'2025-08-02 13:25:20',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(30,5,2,'ride',NULL,'2025-08-03 20:04:00',NULL,2500,NULL,NULL,'assigned','pending',NULL,NULL,'2025-08-02 13:36:58',5,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(31,5,NULL,'service',59,'2025-08-13 17:00:00',432,NULL,NULL,2832,'pending','pending',NULL,NULL,'2025-08-13 08:41:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(32,5,NULL,'service',29,'2025-08-15 18:00:00',360,NULL,NULL,2360,'pending','pending',NULL,NULL,'2025-08-13 08:42:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(33,5,NULL,'service',34,'2025-08-15 18:00:00',1440,NULL,NULL,9440,'pending','pending',NULL,NULL,'2025-08-13 08:42:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(34,5,NULL,'service',66,'2025-08-15 18:00:00',630,NULL,NULL,4130,'pending','pending',NULL,NULL,'2025-08-13 08:42:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(35,5,2,'service',67,'2025-08-19 18:00:00',1800,NULL,NULL,11800,'assigned','pending',NULL,NULL,'2025-08-13 08:44:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(36,5,2,'service',67,'2025-08-14 00:30:00',1800,NULL,NULL,11800,'assigned','pending',NULL,NULL,'2025-08-13 09:05:37',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(37,5,NULL,'service',67,'2025-08-14 00:30:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 03:40:21',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(38,5,NULL,'service',67,'2025-08-13 19:00:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 03:52:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(39,5,NULL,'service',67,'2025-08-13 19:00:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 03:55:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(40,5,NULL,'service',67,'2025-08-13 19:00:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 04:21:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(41,5,NULL,'service',67,'2025-08-13 19:00:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 04:24:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(42,5,NULL,'service',67,'2025-08-13 19:00:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 04:26:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(43,5,NULL,'service',67,'2025-08-14 19:00:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 04:30:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(44,5,NULL,'service',67,'2025-08-13 13:30:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 04:33:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(45,5,NULL,'service',67,'2025-08-13 13:30:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 04:43:48',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(46,12,NULL,'service',59,'2025-08-13 13:30:00',216,NULL,NULL,1416,'pending','pending',NULL,NULL,'2025-08-13 05:20:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',12,NULL,NULL,NULL,NULL),(47,5,NULL,'service',67,'2025-08-13 13:30:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 05:30:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(48,5,NULL,'service',67,'2025-08-13 13:30:00',1800,NULL,NULL,11800,'pending','pending',NULL,NULL,'2025-08-13 05:33:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(49,5,NULL,'service',56,'2025-08-19 07:30:00',540,3540,NULL,3540,'cancelled','refunded',NULL,NULL,'2025-08-19 00:55:34',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(50,5,NULL,'service',27,'2025-08-20 12:30:00',324,2124,NULL,2124,'cancelled','refunded',NULL,NULL,'2025-08-20 05:31:22',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(51,5,2,'service',27,'2025-08-20 12:30:00',324,2124,NULL,2124,'cancelled','refunded',NULL,NULL,'2025-08-20 05:41:05',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(52,5,NULL,'service',67,'2025-08-21 11:00:00',1800,11800,NULL,11800,'cancelled','refunded',NULL,NULL,'2025-08-21 03:36:25',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(53,5,NULL,'ride',NULL,'2025-08-21 15:33:31',NULL,500,NULL,NULL,'cancelled','refunded',NULL,NULL,'2025-08-21 10:03:31',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(54,5,2,'service',67,'2025-08-21 11:30:00',1800,11800,NULL,11800,'cancelled','refunded',NULL,NULL,'2025-08-21 04:36:06',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(55,5,2,'service',67,'2025-08-22 01:00:00',1800,11800,NULL,11800,'cancelled','refunded',NULL,NULL,'2025-08-21 04:59:07',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(56,5,2,'service',67,'2025-08-21 11:30:00',1800,11800,NULL,11800,'cancelled','refunded',NULL,NULL,'2025-08-21 05:02:57',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(57,5,2,'service',25,'2025-08-26 11:00:00',1080,7080,NULL,7080,'cancelled','refunded',NULL,NULL,'2025-08-26 01:33:17',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(58,5,NULL,'service',67,'2025-08-26 11:30:00',1800,11800,NULL,11800,'pending','pending',NULL,NULL,'2025-08-26 01:38:01',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(59,5,NULL,'service',67,'2025-08-26 11:30:00',3600,23600,NULL,23600,'cancelled','refunded',NULL,NULL,'2025-08-26 02:25:31',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(60,5,2,'service',67,'2025-09-10 12:00:00',1800,11800,NULL,11800,'assigned','pending',NULL,NULL,'2025-09-10 04:59:08',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(61,5,2,'service',67,'2025-09-11 08:00:00',1800,11800,NULL,11800,'assigned','pending',NULL,NULL,'2025-09-10 05:14:01',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(62,5,2,'ride',NULL,'2025-09-10 15:00:00',NULL,500,NULL,NULL,'assigned','pending',NULL,NULL,'2025-09-10 11:14:06',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(63,5,NULL,'ride',NULL,'2025-09-10 17:07:26',NULL,500,NULL,NULL,'pending','pending',NULL,NULL,'2025-09-10 11:37:26',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(64,5,NULL,'service',59,'2025-09-13 05:00:00',432,2832,NULL,2832,'pending','pending',NULL,NULL,'2025-09-12 03:38:32',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(65,5,NULL,'service',59,'2025-09-15 10:00:00',216,1416,NULL,1416,'pending','pending',NULL,NULL,'2025-09-14 03:17:08',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(66,5,2,'service',67,'2025-09-14 10:30:00',1800,11800,NULL,11800,'assigned','pending',NULL,NULL,'2025-09-14 03:19:27',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(67,5,2,'service',67,'2025-09-14 12:00:00',1800,11800,NULL,11800,'assigned','pending',NULL,NULL,'2025-09-14 03:30:01',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(68,5,NULL,'service',67,'2025-09-14 12:00:00',1800,11800,NULL,11800,'pending','pending',NULL,NULL,'2025-09-14 03:41:11',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(69,5,NULL,'service',67,'2025-09-14 11:30:00',1800,11800,NULL,11800,'pending','pending',NULL,NULL,'2025-09-14 03:43:32',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(70,5,NULL,'ride',NULL,'2025-09-15 16:57:00',NULL,500,NULL,NULL,'pending','pending',NULL,NULL,'2025-09-15 04:35:32',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(71,5,NULL,'service',67,'2025-10-02 03:30:00',1800,11800,NULL,11800,'pending','pending',NULL,NULL,'2025-09-18 23:55:01',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(72,5,NULL,'service',32,'2025-10-04 10:00:00',720,4720,NULL,4720,'pending','pending',NULL,NULL,'2025-09-21 02:24:09',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(73,5,NULL,'service',67,'2025-10-02 04:00:00',1800,11800,NULL,11800,'pending','pending',NULL,NULL,'2025-09-21 02:25:13',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(74,5,NULL,'service',67,'2025-10-02 04:00:00',1800,11800,NULL,11800,'pending','pending',NULL,NULL,'2025-09-21 02:26:10',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-21 11:34:24',5,NULL,NULL,NULL,NULL),(87,5,2,'service',67,'2025-09-30 11:30:00',1800,11800,NULL,11800,'completed','pending',NULL,NULL,'2025-09-21 04:37:04',1,'per_hour',NULL,NULL,'112406','2025-09-24 17:30:01',NULL,'2025-09-24 11:45:01',5,5.0,'nice service bro','2025-09-21 12:19:26',NULL),(89,5,NULL,'service',67,'2025-10-03 05:30:00',1800,11800,NULL,11800,'pending','pending',NULL,NULL,'2025-09-21 22:55:50',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-22 04:25:50',NULL,NULL,NULL,NULL,NULL),(90,5,2,'service',67,'2025-10-03 05:30:00',1800,11800,NULL,11800,'completed','pending',NULL,NULL,'2025-09-21 22:56:09',1,'per_hour',NULL,NULL,'392953','2025-09-24 17:30:01',NULL,'2025-09-24 11:45:01',NULL,4.0,'good bathroom renovation service, so muh experienced','2025-09-22 04:39:44',NULL),(91,5,2,'service',67,'2025-09-25 04:00:00',1800,11800,NULL,11800,'started','pending',NULL,NULL,'2025-09-21 23:13:13',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-22 04:51:07',NULL,NULL,NULL,NULL,NULL),(94,5,4,'ride',NULL,'2025-09-24 17:16:49',NULL,5052,NULL,NULL,'completed','pending',NULL,NULL,'2025-09-24 11:46:49',1,'per_hour',NULL,NULL,'636543','2025-09-24 22:06:15',NULL,'2025-09-25 06:52:15',NULL,NULL,NULL,NULL,NULL),(95,5,4,'ride',NULL,'2025-09-24 21:46:32',NULL,6075,NULL,NULL,'arrived','pending',NULL,NULL,'2025-09-24 16:16:32',1,'per_hour',NULL,NULL,'994399','2025-09-28 23:22:08',NULL,'2025-09-28 17:37:08',NULL,NULL,NULL,NULL,NULL),(96,18,4,'ride',NULL,'2025-09-28 09:03:12',NULL,5052,NULL,NULL,'completed','pending',NULL,NULL,'2025-09-28 03:33:12',1,'per_hour',NULL,NULL,NULL,NULL,'2025-09-28 23:21:42','2025-09-28 17:52:23',NULL,NULL,NULL,NULL,NULL),(97,18,NULL,'service',59,'2025-09-29 08:00:00',184,1204,NULL,1204,'cancelled','refunded',NULL,NULL,'2025-09-28 15:18:59',1,'per_hour',NULL,NULL,NULL,NULL,NULL,'2025-09-28 20:52:50',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `subcategory_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cart_item` (`customer_id`,`subcategory_id`),
  KEY `subcategory_id` (`subcategory_id`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `carts_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
INSERT INTO `carts` VALUES (64,5,57,1,'2025-09-27 04:54:19'),(66,18,81,1,'2025-09-28 21:02:08');
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_payments`
--

DROP TABLE IF EXISTS `cash_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `worker_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `status` enum('pending','received','disputed') DEFAULT 'pending',
  `received_at` timestamp NULL DEFAULT NULL,
  `payment_method` enum('cash','card','other') DEFAULT 'cash',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_cash_payment` (`booking_id`),
  KEY `worker_id` (`worker_id`),
  KEY `status` (`status`),
  CONSTRAINT `cash_payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_payments_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_payments`
--

LOCK TABLES `cash_payments` WRITE;
/*!40000 ALTER TABLE `cash_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `sender_type` enum('customer','provider') NOT NULL,
  `message_type` enum('text','image','file','system') NOT NULL DEFAULT 'text',
  `content` text NOT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session_messages` (`session_id`,`created_at`),
  KEY `idx_sender_messages` (`sender_id`,`created_at`),
  KEY `idx_message_type` (`message_type`),
  KEY `idx_unread_messages` (`is_read`,`created_at`),
  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,4,9,'provider','text','fhg',NULL,NULL,NULL,0,NULL,'2025-09-24 17:28:25','2025-09-24 17:28:25'),(2,4,5,'customer','text','tu\'',NULL,NULL,NULL,0,NULL,'2025-09-24 17:28:32','2025-09-24 17:28:32'),(3,4,5,'customer','text','dgfhg\'',NULL,NULL,NULL,0,NULL,'2025-09-24 17:28:39','2025-09-24 17:28:39'),(4,4,9,'provider','text','dgfhgjh',NULL,NULL,NULL,0,NULL,'2025-09-24 17:28:44','2025-09-24 17:28:44'),(5,4,5,'customer','text','ghk',NULL,NULL,NULL,0,NULL,'2025-09-24 17:29:04','2025-09-24 17:29:04'),(6,4,9,'provider','text','dgfhgjhkjl',NULL,NULL,NULL,0,NULL,'2025-09-24 17:29:11','2025-09-24 17:29:11'),(7,4,5,'customer','text','adfsgfh',NULL,NULL,NULL,0,NULL,'2025-09-24 17:30:34','2025-09-24 17:30:34'),(8,4,5,'customer','text','aghj\'',NULL,NULL,NULL,0,NULL,'2025-09-24 17:30:43','2025-09-24 17:30:43'),(9,4,5,'customer','text','ghjbjn',NULL,NULL,NULL,0,NULL,'2025-09-24 17:33:42','2025-09-24 17:33:42'),(10,4,5,'customer','text','gfhjhk',NULL,NULL,NULL,0,NULL,'2025-09-24 17:35:07','2025-09-24 17:35:07'),(11,4,5,'customer','text','zfxgchj',NULL,NULL,NULL,0,NULL,'2025-09-24 17:37:54','2025-09-24 17:37:54'),(12,4,9,'provider','text','fsghgjlhkl',NULL,NULL,NULL,0,NULL,'2025-09-24 17:41:20','2025-09-24 17:41:20'),(13,4,5,'customer','text','hLooo',NULL,NULL,NULL,0,NULL,'2025-09-24 17:42:35','2025-09-24 17:42:35'),(14,4,5,'customer','text','wegfrhgtj',NULL,NULL,NULL,0,NULL,'2025-09-25 06:14:01','2025-09-25 06:14:01'),(15,4,5,'customer','text','hi, come here',NULL,NULL,NULL,0,NULL,'2025-09-25 06:17:12','2025-09-25 06:17:12'),(16,4,9,'provider','text','yes coming',NULL,NULL,NULL,0,NULL,'2025-09-25 06:17:19','2025-09-25 06:17:19'),(17,4,5,'customer','text','thank you',NULL,NULL,NULL,0,NULL,'2025-09-25 06:17:26','2025-09-25 06:17:26'),(18,4,9,'provider','text','you are welcome',NULL,NULL,NULL,0,NULL,'2025-09-25 06:17:34','2025-09-25 06:17:34'),(19,4,5,'customer','text','ghjk',NULL,NULL,NULL,0,NULL,'2025-09-25 06:52:20','2025-09-25 06:52:20'),(20,4,5,'customer','text','yui]',NULL,NULL,NULL,0,NULL,'2025-09-25 06:52:26','2025-09-25 06:52:26'),(21,1,5,'customer','text','fsghjk',NULL,NULL,NULL,0,NULL,'2025-09-27 16:17:29','2025-09-27 16:17:29'),(22,1,5,'customer','text','wonder full',NULL,NULL,NULL,0,NULL,'2025-09-27 16:17:59','2025-09-27 16:17:59'),(23,1,7,'provider','text','thanks',NULL,NULL,NULL,0,NULL,'2025-09-27 16:18:04','2025-09-27 16:18:04'),(24,1,5,'customer','text','ok',NULL,NULL,NULL,0,NULL,'2025-09-27 16:18:09','2025-09-27 16:18:09'),(25,1,5,'customer','text','qewregrthyuiop[]',NULL,NULL,NULL,0,NULL,'2025-09-27 16:19:59','2025-09-27 16:19:59'),(26,1,7,'provider','text','wefgrthyjuio[]',NULL,NULL,NULL,0,NULL,'2025-09-27 16:20:02','2025-09-27 16:20:02'),(27,5,5,'customer','text','fgh[',NULL,NULL,NULL,0,NULL,'2025-09-27 16:59:02','2025-09-27 16:59:02'),(28,5,5,'customer','text','fgh\'',NULL,NULL,NULL,0,NULL,'2025-09-27 16:59:22','2025-09-27 16:59:22'),(29,5,5,'customer','text','efrth\\',NULL,NULL,NULL,0,NULL,'2025-09-27 17:00:10','2025-09-27 17:00:10'),(30,5,9,'provider','text','thyuji[',NULL,NULL,NULL,0,NULL,'2025-09-27 17:00:15','2025-09-27 17:00:15'),(31,5,9,'provider','text','huo',NULL,NULL,NULL,0,NULL,'2025-09-27 17:00:26','2025-09-27 17:00:26'),(32,5,5,'customer','text','vfghj\'',NULL,NULL,NULL,0,NULL,'2025-09-27 17:00:31','2025-09-27 17:00:31'),(33,5,5,'customer','text','hii',NULL,NULL,NULL,0,NULL,'2025-09-27 17:01:02','2025-09-27 17:01:02'),(34,5,9,'provider','text','jii\'',NULL,NULL,NULL,0,NULL,'2025-09-27 17:01:13','2025-09-27 17:01:13'),(35,5,9,'provider','text','sfghj',NULL,NULL,NULL,0,NULL,'2025-09-27 17:15:25','2025-09-27 17:15:25'),(36,5,9,'provider','text','hi',NULL,NULL,NULL,0,NULL,'2025-09-27 17:23:05','2025-09-27 17:23:05'),(37,5,5,'customer','text','hkjnk',NULL,NULL,NULL,0,NULL,'2025-09-27 17:23:25','2025-09-27 17:23:25'),(38,5,9,'provider','text','oiuhyg\\',NULL,NULL,NULL,0,NULL,'2025-09-27 17:23:31','2025-09-27 17:23:31'),(39,5,9,'provider','text','hlo',NULL,NULL,NULL,0,NULL,'2025-09-27 17:31:08','2025-09-27 17:31:08'),(40,5,5,'customer','text','yes',NULL,NULL,NULL,0,NULL,'2025-09-27 17:31:19','2025-09-27 17:31:19'),(41,5,5,'customer','text','yrsss\'',NULL,NULL,NULL,0,NULL,'2025-09-27 17:31:34','2025-09-27 17:31:34'),(42,5,5,'customer','text','hlooo',NULL,NULL,NULL,0,NULL,'2025-09-27 17:32:02','2025-09-27 17:32:02'),(43,5,9,'provider','text','hii',NULL,NULL,NULL,0,NULL,'2025-09-27 17:32:31','2025-09-27 17:32:31'),(44,5,9,'provider','text','kjh;\'',NULL,NULL,NULL,0,NULL,'2025-09-27 17:32:39','2025-09-27 17:32:39'),(45,5,5,'customer','text','hjk\'',NULL,NULL,NULL,0,NULL,'2025-09-27 17:32:48','2025-09-27 17:32:48'),(46,5,5,'customer','text','hii',NULL,NULL,NULL,0,NULL,'2025-09-27 17:55:20','2025-09-27 17:55:20'),(47,5,5,'customer','text','hii\'',NULL,NULL,NULL,0,NULL,'2025-09-27 17:55:50','2025-09-27 17:55:50'),(48,5,9,'provider','text','erhtyu\'[',NULL,NULL,NULL,0,NULL,'2025-09-27 17:56:05','2025-09-27 17:56:05'),(49,5,9,'provider','text','Hooo',NULL,NULL,NULL,0,NULL,'2025-09-27 18:01:43','2025-09-27 18:01:43'),(50,5,9,'provider','text','bhaiii',NULL,NULL,NULL,0,NULL,'2025-09-27 18:13:30','2025-09-27 18:13:30'),(51,5,5,'customer','text','hii',NULL,NULL,NULL,0,NULL,'2025-09-27 18:13:46','2025-09-27 18:13:46'),(52,5,5,'customer','text','huii',NULL,NULL,NULL,0,NULL,'2025-09-27 18:13:55','2025-09-27 18:13:55'),(53,5,5,'customer','text','bhaiii',NULL,NULL,NULL,0,NULL,'2025-09-27 18:14:08','2025-09-27 18:14:08'),(54,5,9,'provider','text','boolo bhai',NULL,NULL,NULL,0,NULL,'2025-09-27 18:14:19','2025-09-27 18:14:19'),(55,5,5,'customer','text','hu',NULL,NULL,NULL,0,NULL,'2025-09-27 18:22:39','2025-09-27 18:22:39'),(56,5,9,'provider','text','bhai',NULL,NULL,NULL,0,NULL,'2025-09-27 18:45:20','2025-09-27 18:45:20'),(57,5,5,'customer','text','asb',NULL,NULL,NULL,0,NULL,'2025-09-27 18:45:32','2025-09-27 18:45:32'),(58,5,9,'provider','text','efwrtyui[][',NULL,NULL,NULL,0,NULL,'2025-09-27 18:46:22','2025-09-27 18:46:22'),(59,5,5,'customer','text','sfdghjk\'',NULL,NULL,NULL,0,NULL,'2025-09-27 18:46:32','2025-09-27 18:46:32'),(71,5,5,'customer','text','bhi',NULL,NULL,NULL,0,NULL,'2025-09-28 16:27:40','2025-09-28 16:27:40'),(72,5,5,'customer','text','hii',NULL,NULL,NULL,0,NULL,'2025-09-28 16:28:03','2025-09-28 16:28:03'),(73,5,5,'customer','text','bhii',NULL,NULL,NULL,0,NULL,'2025-09-28 16:28:32','2025-09-28 16:28:32'),(74,5,9,'provider','text','Hii',NULL,NULL,NULL,0,NULL,'2025-09-28 16:50:47','2025-09-28 16:50:47'),(75,5,5,'customer','text','efrghj',NULL,NULL,NULL,0,NULL,'2025-09-28 16:51:18','2025-09-28 16:51:18'),(76,5,5,'customer','text','esfhj',NULL,NULL,NULL,0,NULL,'2025-09-28 16:51:22','2025-09-28 16:51:22'),(77,5,9,'provider','text','sgfjhjgjhjjj',NULL,NULL,NULL,0,NULL,'2025-09-28 17:15:10','2025-09-28 17:15:10'),(78,5,9,'provider','text','Hloo',NULL,NULL,NULL,0,NULL,'2025-09-28 17:15:35','2025-09-28 17:15:35'),(79,5,9,'provider','text','ghhi',NULL,NULL,NULL,0,NULL,'2025-09-28 17:36:08','2025-09-28 17:36:08'),(80,5,5,'customer','text','bhioi',NULL,NULL,NULL,0,NULL,'2025-09-28 17:36:18','2025-09-28 17:36:18'),(81,5,5,'customer','text','heehehe',NULL,NULL,NULL,0,NULL,'2025-09-28 17:36:27','2025-09-28 17:36:27'),(82,5,9,'provider','text','hammaya',NULL,NULL,NULL,0,NULL,'2025-09-28 17:36:35','2025-09-28 17:36:35');
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_notifications`
--

DROP TABLE IF EXISTS `chat_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `message_id` int NOT NULL,
  `notification_type` enum('new_message','typing','user_online','user_offline') NOT NULL,
  `is_sent` tinyint(1) NOT NULL DEFAULT '0',
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipient_notifications` (`recipient_id`,`is_sent`),
  KEY `idx_session_notifications` (`session_id`,`created_at`),
  KEY `idx_unsent_notifications` (`is_sent`,`created_at`),
  KEY `fk_notification_message` (`message_id`),
  CONSTRAINT `fk_notification_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_notifications`
--

LOCK TABLES `chat_notifications` WRITE;
/*!40000 ALTER TABLE `chat_notifications` DISABLE KEYS */;
INSERT INTO `chat_notifications` VALUES (1,4,5,1,'new_message',1,NULL,'2025-09-24 17:28:25'),(2,4,9,2,'new_message',1,NULL,'2025-09-24 17:28:32'),(3,4,9,3,'new_message',1,NULL,'2025-09-24 17:28:39'),(4,4,5,4,'new_message',1,NULL,'2025-09-24 17:28:44'),(5,4,9,5,'new_message',1,NULL,'2025-09-24 17:29:04'),(6,4,5,6,'new_message',1,NULL,'2025-09-24 17:29:11'),(7,4,9,7,'new_message',1,NULL,'2025-09-24 17:30:34'),(8,4,9,8,'new_message',1,NULL,'2025-09-24 17:30:43'),(9,4,9,9,'new_message',1,NULL,'2025-09-24 17:33:42'),(10,4,9,10,'new_message',1,NULL,'2025-09-24 17:35:07'),(11,4,9,11,'new_message',1,NULL,'2025-09-24 17:37:54'),(12,4,5,12,'new_message',0,NULL,'2025-09-24 17:41:20'),(13,4,9,13,'new_message',1,NULL,'2025-09-24 17:42:35'),(14,4,9,14,'new_message',0,NULL,'2025-09-25 06:14:01'),(15,4,9,15,'new_message',1,NULL,'2025-09-25 06:17:12'),(16,4,5,16,'new_message',1,NULL,'2025-09-25 06:17:19'),(17,4,9,17,'new_message',1,NULL,'2025-09-25 06:17:26'),(18,4,5,18,'new_message',1,NULL,'2025-09-25 06:17:34'),(19,4,9,19,'new_message',1,NULL,'2025-09-25 06:52:20'),(20,4,9,20,'new_message',1,NULL,'2025-09-25 06:52:26'),(21,1,2,21,'new_message',0,NULL,'2025-09-27 16:17:29'),(22,1,2,22,'new_message',0,NULL,'2025-09-27 16:17:59'),(23,1,5,23,'new_message',1,NULL,'2025-09-27 16:18:04'),(24,1,2,24,'new_message',0,NULL,'2025-09-27 16:18:09'),(25,1,2,25,'new_message',0,NULL,'2025-09-27 16:19:59'),(26,1,5,26,'new_message',1,NULL,'2025-09-27 16:20:02'),(27,5,9,27,'new_message',1,NULL,'2025-09-27 16:59:02'),(28,5,9,28,'new_message',1,NULL,'2025-09-27 16:59:22'),(29,5,9,29,'new_message',1,NULL,'2025-09-27 17:00:10'),(30,5,5,30,'new_message',1,NULL,'2025-09-27 17:00:15'),(31,5,5,31,'new_message',1,NULL,'2025-09-27 17:00:26'),(32,5,9,32,'new_message',1,NULL,'2025-09-27 17:00:31'),(33,5,9,33,'new_message',1,NULL,'2025-09-27 17:01:03'),(34,5,5,34,'new_message',1,NULL,'2025-09-27 17:01:13'),(35,5,5,35,'new_message',1,NULL,'2025-09-27 17:15:25'),(36,5,5,36,'new_message',1,NULL,'2025-09-27 17:23:05'),(37,5,9,37,'new_message',1,NULL,'2025-09-27 17:23:25'),(38,5,5,38,'new_message',1,NULL,'2025-09-27 17:23:31'),(39,5,5,39,'new_message',0,NULL,'2025-09-27 17:31:08'),(40,5,9,40,'new_message',1,NULL,'2025-09-27 17:31:19'),(41,5,9,41,'new_message',1,NULL,'2025-09-27 17:31:34'),(42,5,9,42,'new_message',1,NULL,'2025-09-27 17:32:02'),(43,5,5,43,'new_message',1,NULL,'2025-09-27 17:32:31'),(44,5,5,44,'new_message',1,NULL,'2025-09-27 17:32:39'),(45,5,9,45,'new_message',1,NULL,'2025-09-27 17:32:48'),(46,5,9,52,'new_message',0,NULL,'2025-09-27 18:13:55'),(47,5,9,53,'new_message',1,NULL,'2025-09-27 18:14:09'),(48,5,5,54,'new_message',1,NULL,'2025-09-27 18:14:19'),(49,5,9,55,'new_message',1,NULL,'2025-09-27 18:22:39'),(50,5,5,56,'new_message',0,NULL,'2025-09-27 18:45:20'),(51,5,9,57,'new_message',1,NULL,'2025-09-27 18:45:32'),(52,5,5,58,'new_message',0,NULL,'2025-09-27 18:46:22'),(53,5,9,59,'new_message',1,NULL,'2025-09-27 18:46:32'),(65,5,9,71,'new_message',0,NULL,'2025-09-28 16:27:40'),(66,5,9,72,'new_message',0,NULL,'2025-09-28 16:28:03'),(67,5,9,73,'new_message',1,NULL,'2025-09-28 16:28:32'),(68,5,5,74,'new_message',1,NULL,'2025-09-28 16:50:47'),(69,5,9,75,'new_message',1,NULL,'2025-09-28 16:51:18'),(70,5,9,76,'new_message',1,NULL,'2025-09-28 16:51:22'),(71,5,5,77,'new_message',1,NULL,'2025-09-28 17:15:10'),(72,5,5,78,'new_message',1,NULL,'2025-09-28 17:15:35'),(73,5,5,79,'new_message',1,NULL,'2025-09-28 17:36:08'),(74,5,9,80,'new_message',1,NULL,'2025-09-28 17:36:18'),(75,5,9,81,'new_message',1,NULL,'2025-09-28 17:36:27'),(76,5,5,82,'new_message',1,NULL,'2025-09-28 17:36:35');
/*!40000 ALTER TABLE `chat_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_participants`
--

DROP TABLE IF EXISTS `chat_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `user_type` enum('customer','provider') NOT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT '0',
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_user` (`session_id`,`user_id`),
  KEY `idx_user_sessions` (`user_id`,`is_online`),
  KEY `idx_online_users` (`is_online`,`last_seen_at`),
  CONSTRAINT `fk_participant_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_participant_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_participants`
--

LOCK TABLES `chat_participants` WRITE;
/*!40000 ALTER TABLE `chat_participants` DISABLE KEYS */;
INSERT INTO `chat_participants` VALUES (1,1,5,'customer',0,'2025-09-28 17:37:15','2025-09-22 07:10:00',NULL),(2,1,2,'provider',0,NULL,'2025-09-22 07:10:00',NULL);
/*!40000 ALTER TABLE `chat_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_sessions`
--

DROP TABLE IF EXISTS `chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `session_status` enum('active','ended','deleted') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` timestamp NULL DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `message_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_chat` (`booking_id`),
  KEY `idx_customer_sessions` (`customer_id`,`session_status`),
  KEY `idx_provider_sessions` (`provider_id`,`session_status`),
  KEY `idx_session_status` (`session_status`),
  KEY `idx_last_message` (`last_message_at`),
  CONSTRAINT `fk_chat_session_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_session_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_session_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_sessions`
--

LOCK TABLES `chat_sessions` WRITE;
/*!40000 ALTER TABLE `chat_sessions` DISABLE KEYS */;
INSERT INTO `chat_sessions` VALUES (1,91,5,2,'active','2025-09-22 07:10:00',NULL,NULL,0),(4,94,5,9,'active','2025-09-24 12:05:36',NULL,NULL,0),(5,95,5,9,'active','2025-09-27 16:46:00',NULL,NULL,0),(7,96,18,9,'ended','2025-09-28 03:35:06',NULL,'2025-09-28 17:52:23',0);
/*!40000 ALTER TABLE `chat_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_addresses`
--

DROP TABLE IF EXISTS `customer_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_addresses` (
  `address_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `address` text NOT NULL,
  `pin_code` varchar(10) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `country` varchar(100) DEFAULT 'India',
  `location_lat` decimal(10,8) DEFAULT NULL,
  `location_lng` decimal(11,8) DEFAULT NULL,
  `location` point NOT NULL,
  `address_type` enum('home','work','other') DEFAULT 'home',
  `address_label` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`),
  KEY `idx_customer_default` (`customer_id`,`is_default`),
  KEY `idx_customer_active` (`customer_id`,`is_active`),
  SPATIAL KEY `idx_coordinates` (`location`),
  CONSTRAINT `customer_addresses_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_addresses`
--

LOCK TABLES `customer_addresses` WRITE;
/*!40000 ALTER TABLE `customer_addresses` DISABLE KEYS */;
INSERT INTO `customer_addresses` (`address_id`, `customer_id`, `address`, `pin_code`, `city`, `state`, `country`, `location_lat`, `location_lng`, `location`, `address_type`, `address_label`, `is_default`, `is_active`, `created_at`, `updated_at`) VALUES
(1,5,'2-5 Thimmaraopeta ','507168','Khammam','Telangana','India',0.00000000,0.00000000,POINT(0.00000000, 0.00000000), 'home','Home',0,1,'2025-07-31 04:36:54','2025-08-13 11:03:29'),
(2,12,'Nad, Visakhapatnam','530027','Visakhapatnam','Andhra pradesh','India',17.74349820,83.23240090,POINT(83.23240090, 17.74349820), 'home','home',0,1,'2025-08-13 10:49:44','2025-08-13 10:49:45'),
(3,12,'Nad, Visakhapatnam','530027','Visakhapatnam','Andhra pradesh','India',17.74349820,83.23240090,POINT(83.23240090, 17.74349820), 'home','home',1,1,'2025-08-13 10:49:45','2025-08-13 10:49:45'),
(4,5,'2-5 Thimmaraopeta','500012','Khammam',' Telangana','India',17.24653510,80.15003260,POINT(80.15003260, 17.24653510), 'work','',0,1,'2025-08-13 11:03:29','2025-08-13 11:03:30'),
(5,5,'2-5 Thimmaraopeta, 123','500012','Khammam',' Telangana','India',17.24653510,80.15003260,POINT(80.15003260, 17.24653510), 'work','',1,1,'2025-08-13 11:03:30','2025-08-29 05:36:01'),
(6,18,'Nad','530027','Visakhapatnam','Andhra Pradesh','India',20.59370000,78.96290000,POINT(78.96290000, 20.59370000), 'home','home',1,1,'2025-09-28 20:30:38','2025-09-28 20:48:19');
/*!40000 ALTER TABLE `customer_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_types`
--

DROP TABLE IF EXISTS `customer_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_types`
--

LOCK TABLES `customer_types` WRITE;
/*!40000 ALTER TABLE `customer_types` DISABLE KEYS */;
INSERT INTO `customer_types` VALUES (1,'Normal',0.00),(2,'Senior Citizen',10.00),(3,'Student',15.00);
/*!40000 ALTER TABLE `customer_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_verifications`
--

DROP TABLE IF EXISTS `customer_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `document_url` varchar(255) NOT NULL,
  `verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `customer_verifications_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_verifications`
--

LOCK TABLES `customer_verifications` WRITE;
/*!40000 ALTER TABLE `customer_verifications` DISABLE KEYS */;
INSERT INTO `customer_verifications` VALUES (4,18,'customer_documents/18/1758942965534_Screenshot_2025-09-26_141352.png','verified','2025-09-27 03:16:05'),(5,5,'customer_documents/5/1758948870091_Screenshot_2025-09-26_151419.png','verified','2025-09-27 04:54:30');
/*!40000 ALTER TABLE `customer_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_wallet_promotions_usage`
--

DROP TABLE IF EXISTS `customer_wallet_promotions_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_wallet_promotions_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `promotion_id` int NOT NULL,
  `topup_request_id` int NOT NULL,
  `bonus_amount` decimal(10,2) NOT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_customer_promotion_topup` (`customer_id`,`promotion_id`,`topup_request_id`),
  KEY `topup_request_id` (`topup_request_id`),
  KEY `idx_promotion_usage_customer` (`customer_id`),
  KEY `idx_promotion_usage_promotion` (`promotion_id`),
  CONSTRAINT `customer_wallet_promotions_usage_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_wallet_promotions_usage_ibfk_2` FOREIGN KEY (`promotion_id`) REFERENCES `wallet_promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_wallet_promotions_usage_ibfk_3` FOREIGN KEY (`topup_request_id`) REFERENCES `wallet_topup_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_wallet_promotions_usage`
--

LOCK TABLES `customer_wallet_promotions_usage` WRITE;
/*!40000 ALTER TABLE `customer_wallet_promotions_usage` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_wallet_promotions_usage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `customer_wallet_summary`
--

DROP TABLE IF EXISTS `customer_wallet_summary`;
/*!50001 DROP VIEW IF EXISTS `customer_wallet_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `customer_wallet_summary` AS SELECT 
 1 AS `wallet_id`,
 1 AS `customer_id`,
 1 AS `customer_name`,
 1 AS `customer_phone`,
 1 AS `customer_email`,
 1 AS `current_balance`,
 1 AS `total_added`,
 1 AS `total_spent`,
 1 AS `total_refunded`,
 1 AS `is_active`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `customer_wallet_transactions`
--

DROP TABLE IF EXISTS `customer_wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wallet_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `transaction_type` enum('credit','debit','refund','topup','charge','bonus') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance_before` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `description` text,
  `reference_id` varchar(100) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `idx_customer_wallet_transactions_wallet` (`wallet_id`),
  KEY `idx_customer_wallet_transactions_type` (`transaction_type`),
  KEY `idx_customer_wallet_transactions_status` (`status`),
  CONSTRAINT `customer_wallet_transactions_ibfk_1` FOREIGN KEY (`wallet_id`) REFERENCES `customer_wallets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_wallet_transactions_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_wallet_transactions`
--

LOCK TABLES `customer_wallet_transactions` WRITE;
/*!40000 ALTER TABLE `customer_wallet_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_wallets`
--

DROP TABLE IF EXISTS `customer_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `current_balance` decimal(10,2) DEFAULT '0.00',
  `total_added` decimal(10,2) DEFAULT '0.00',
  `total_spent` decimal(10,2) DEFAULT '0.00',
  `total_refunded` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_customer_wallet` (`customer_id`),
  KEY `idx_customer_wallet_active` (`is_active`),
  CONSTRAINT `customer_wallets_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_wallets`
--

LOCK TABLES `customer_wallets` WRITE;
/*!40000 ALTER TABLE `customer_wallets` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL,
  `address` text,
  `pin_code` varchar(10) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `location_lat` decimal(10,8) DEFAULT NULL,
  `location_lng` decimal(11,8) DEFAULT NULL,
  `customer_type_id` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `customer_type_id` (`customer_type_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`),
  CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`customer_type_id`) REFERENCES `customer_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),(5,'2-5 Thimmaraopeta','507168','Khammam','Telangana','India',0.00000000,0.00000000,3),(12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),(13,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),(14,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),(17,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),(18,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_settlements`
--

DROP TABLE IF EXISTS `daily_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_settlements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `settlement_date` date NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `transaction_count` int DEFAULT '0',
  `upi_id` varchar(100) NOT NULL,
  `settlement_status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `razorpay_payout_id` varchar(100) DEFAULT NULL,
  `failure_reason` text,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_daily_settlement` (`worker_id`,`settlement_date`),
  KEY `provider_id` (`provider_id`),
  KEY `idx_settlements_date` (`settlement_date`),
  KEY `idx_settlements_status` (`settlement_status`),
  KEY `idx_settlements_worker` (`worker_id`),
  CONSTRAINT `daily_settlements_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `daily_settlements_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_settlements`
--

LOCK TABLES `daily_settlements` WRITE;
/*!40000 ALTER TABLE `daily_settlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drivers` (
  `provider_id` int NOT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `license_expiry_date` date DEFAULT NULL,
  `license_issuing_authority` varchar(100) DEFAULT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `driving_experience_years` int DEFAULT NULL,
  `years_of_commercial_driving_exp` int DEFAULT '0',
  `vehicle_registration_number` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`provider_id`),
  CONSTRAINT `fk_driver_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES (2,'AP0310481938993','2027-10-19','RTO','two_wheeler',2,1,'AP031Q5678');
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fare_disputes`
--

DROP TABLE IF EXISTS `fare_disputes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fare_disputes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `raised_by` enum('customer','provider','system') NOT NULL,
  `dispute_type` enum('fare_deviation','overcharge','service_issue','payment_issue') NOT NULL,
  `estimated_fare` decimal(10,2) NOT NULL,
  `actual_fare` decimal(10,2) NOT NULL,
  `disputed_amount` decimal(10,2) NOT NULL,
  `description` text,
  `status` enum('open','under_review','resolved','rejected','escalated') NOT NULL DEFAULT 'open',
  `resolution` text,
  `resolved_amount` decimal(10,2) DEFAULT NULL,
  `resolved_by` int DEFAULT NULL COMMENT 'Admin user who resolved',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_disputes` (`booking_id`),
  KEY `idx_dispute_status` (`status`,`created_at`),
  KEY `fk_dispute_resolver` (`resolved_by`),
  CONSTRAINT `fk_dispute_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dispute_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fare_disputes`
--

LOCK TABLES `fare_disputes` WRITE;
/*!40000 ALTER TABLE `fare_disputes` DISABLE KEYS */;
/*!40000 ALTER TABLE `fare_disputes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_links`
--

DROP TABLE IF EXISTS `payment_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `purpose` varchar(100) NOT NULL COMMENT 'e.g., additional_fare, cancellation_fee, etc.',
  `razorpay_link_id` varchar(100) DEFAULT NULL,
  `razorpay_link_url` text,
  `status` enum('created','sent','paid','expired','cancelled') NOT NULL DEFAULT 'created',
  `expires_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_payment_links` (`booking_id`),
  KEY `idx_user_payment_links` (`user_id`,`status`),
  KEY `idx_payment_links_status_expiry` (`status`,`expires_at`),
  CONSTRAINT `fk_payment_link_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_link_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_links`
--

LOCK TABLES `payment_links` WRITE;
/*!40000 ALTER TABLE `payment_links` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_refunds`
--

DROP TABLE IF EXISTS `payment_refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `refund_id` varchar(50) DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `reason` text,
  `status` enum('pending','processed','failed') DEFAULT 'pending',
  `refunded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refund_id` (`refund_id`),
  KEY `payment_id` (`payment_id`),
  CONSTRAINT `payment_refunds_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_refunds`
--

LOCK TABLES `payment_refunds` WRITE;
/*!40000 ALTER TABLE `payment_refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `user_id` int NOT NULL,
  `razorpay_payment_id` varchar(50) DEFAULT NULL,
  `razorpay_order_id` varchar(50) DEFAULT NULL,
  `upi_transaction_id` int DEFAULT NULL,
  `cash_payment_id` int DEFAULT NULL,
  `method` varchar(20) DEFAULT NULL,
  `payment_type` enum('razorpay','upi') DEFAULT 'razorpay',
  `status` enum('created','authorized','captured','failed','refunded') DEFAULT 'created',
  `amount_paid` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `email` varchar(100) DEFAULT NULL,
  `contact` varchar(15) DEFAULT NULL,
  `captured_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `razorpay_payment_id` (`razorpay_payment_id`),
  KEY `booking_id` (`booking_id`),
  KEY `user_id` (`user_id`),
  KEY `upi_transaction_id` (`upi_transaction_id`),
  KEY `cash_payment_id` (`cash_payment_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`upi_transaction_id`) REFERENCES `upi_transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_ibfk_4` FOREIGN KEY (`cash_payment_id`) REFERENCES `cash_payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payout_batches`
--

DROP TABLE IF EXISTS `payout_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payout_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_reference` varchar(100) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `total_providers` int NOT NULL,
  `payout_method` enum('bank_transfer','upi','wallet') NOT NULL DEFAULT 'bank_transfer',
  `status` enum('created','processing','completed','failed','cancelled') NOT NULL DEFAULT 'created',
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_by` int NOT NULL COMMENT 'Admin user who created the batch',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_batch_reference` (`batch_reference`),
  KEY `idx_payout_status` (`status`,`created_at`),
  KEY `fk_payout_batch_creator` (`created_by`),
  CONSTRAINT `fk_payout_batch_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payout_batches`
--

LOCK TABLES `payout_batches` WRITE;
/*!40000 ALTER TABLE `payout_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `payout_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payout_details`
--

DROP TABLE IF EXISTS `payout_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payout_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `earnings_count` int NOT NULL COMMENT 'Number of earnings records included',
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `bank_account_id` int DEFAULT NULL,
  `status` enum('pending','processing','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
  `failure_reason` text,
  `external_reference` varchar(100) DEFAULT NULL COMMENT 'Bank/UPI transaction reference',
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch_payouts` (`batch_id`),
  KEY `idx_provider_payouts` (`provider_id`,`status`),
  KEY `fk_payout_detail_bank_account` (`bank_account_id`),
  CONSTRAINT `fk_payout_detail_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `provider_banking_details` (`id`),
  CONSTRAINT `fk_payout_detail_batch` FOREIGN KEY (`batch_id`) REFERENCES `payout_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payout_detail_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payout_details`
--

LOCK TABLES `payout_details` WRITE;
/*!40000 ALTER TABLE `payout_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `payout_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pricing_rules`
--

DROP TABLE IF EXISTS `pricing_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_key` varchar(100) NOT NULL COMMENT 'e.g., surge_demand_threshold, cancellation_fee_amount',
  `rule_value` text NOT NULL COMMENT 'JSON or simple value',
  `rule_type` enum('number','percentage','json','boolean','time') NOT NULL DEFAULT 'number',
  `description` text COMMENT 'Human-readable description of the rule',
  `category` varchar(50) DEFAULT 'general' COMMENT 'e.g., surge, cancellation, promo, night_charges',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rule_key` (`rule_key`),
  KEY `idx_pricing_rules_category` (`category`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pricing_rules`
--

LOCK TABLES `pricing_rules` WRITE;
/*!40000 ALTER TABLE `pricing_rules` DISABLE KEYS */;
INSERT INTO `pricing_rules` VALUES (1,'surge_demand_threshold','80','number','Demand percentage threshold to trigger surge pricing','surge',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(2,'surge_max_multiplier','4.0','number','Maximum surge multiplier allowed','surge',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(3,'surge_calculation_interval_minutes','5','number','How often to recalculate surge pricing','surge',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(4,'night_hours_start','23:00','time','Night charges start time (24-hour format)','night_charges',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(5,'night_hours_end','06:00','time','Night charges end time (24-hour format)','night_charges',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(6,'cancellation_fee_customer','20.00','number','Cancellation fee charged to customer (INR)','cancellation',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(7,'cancellation_fee_driver','10.00','number','Cancellation fee charged to driver (INR)','cancellation',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(8,'cancellation_grace_period_minutes','5','number','Grace period before cancellation fee applies','cancellation',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(9,'waiting_charges_per_minute','2.00','number','Waiting charges per minute after grace period','waiting',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(10,'waiting_grace_period_minutes','3','number','Free waiting time before charges apply','waiting',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(11,'max_fare_deviation_percentage','20','number','Maximum allowed deviation between estimated and actual fare','validation',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(12,'trip_timeout_multiplier','2.0','number','Auto-end trip after ETA ├ù this multiplier','timeout',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(13,'platform_commission_percentage','20','percentage','Platform commission on completed rides','commission',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(14,'gst_percentage','18','percentage','GST percentage on ride fares','tax',1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(15,'free_cancellation_time_minutes','5','number','Free cancellation window after booking','cancellation',1,'2025-09-19 05:20:48','2025-09-19 05:20:48');
/*!40000 ALTER TABLE `pricing_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pricing_vehicle_types`
--

DROP TABLE IF EXISTS `pricing_vehicle_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_vehicle_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'e.g., Bike, Hatchback, Sedan, SUV',
  `display_name` varchar(100) NOT NULL COMMENT 'User-friendly name',
  `base_fare` decimal(8,2) NOT NULL DEFAULT '25.00' COMMENT 'Base fare in INR',
  `rate_per_km` decimal(8,2) NOT NULL DEFAULT '12.00' COMMENT 'Rate per kilometer in INR',
  `rate_per_min` decimal(8,2) NOT NULL DEFAULT '1.50' COMMENT 'Rate per minute in INR',
  `minimum_fare` decimal(8,2) NOT NULL DEFAULT '50.00' COMMENT 'Minimum fare guarantee',
  `free_km_threshold` decimal(5,2) NOT NULL DEFAULT '2.00' COMMENT 'Free kilometers included in base fare',
  `vehicle_multiplier` decimal(4,2) NOT NULL DEFAULT '1.00' COMMENT 'Vehicle type multiplier (bike=1.0, sedan=1.4, etc.)',
  `night_multiplier` decimal(4,2) NOT NULL DEFAULT '1.25' COMMENT 'Night time multiplier (11 PM - 6 AM)',
  `surge_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether surge pricing applies to this vehicle type',
  `max_surge_multiplier` decimal(4,2) NOT NULL DEFAULT '3.00' COMMENT 'Maximum allowed surge multiplier',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vehicle_name` (`name`),
  KEY `idx_vehicle_types_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pricing_vehicle_types`
--

LOCK TABLES `pricing_vehicle_types` WRITE;
/*!40000 ALTER TABLE `pricing_vehicle_types` DISABLE KEYS */;
INSERT INTO `pricing_vehicle_types` VALUES (1,'bike','Bike',20.00,8.00,1.00,30.00,2.00,1.00,1.20,1,2.50,1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(2,'hatchback','Hatchback',25.00,12.00,1.50,50.00,2.00,1.20,1.25,1,3.00,1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(3,'sedan','Sedan',35.00,15.00,2.00,70.00,2.50,1.40,1.30,1,3.50,1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(4,'suv','SUV',50.00,20.00,2.50,100.00,3.00,1.80,1.35,1,4.00,1,'2025-09-19 05:20:48','2025-09-19 05:20:48'),(5,'van','Van/Tempo',60.00,18.00,2.00,120.00,3.00,1.60,1.30,1,3.00,1,'2025-09-19 05:20:48','2025-09-19 05:20:48');
/*!40000 ALTER TABLE `pricing_vehicle_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_addresses`
--

DROP TABLE IF EXISTS `provider_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_addresses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int DEFAULT NULL,
  `address_type` enum('permanent','temporary','mailing') DEFAULT 'permanent',
  `street_address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `provider_addresses_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_addresses`
--

LOCK TABLES `provider_addresses` WRITE;
/*!40000 ALTER TABLE `provider_addresses` DISABLE KEYS */;
INSERT INTO `provider_addresses` VALUES (1,2,'permanent','Thimmaraopet, Enkoor mandal','Khammam','Telangana','507168','2025-08-01 04:04:00','2025-08-02 12:52:10'),(2,3,'permanent','2-5 Thimmaraopeta','Khammam','Telangana','507168','2025-08-01 13:50:13','2025-08-01 14:38:14'),(3,4,'permanent','Vishakapatnam Ralway Station, Railway New Colony, Visakhapatnam, Visakhapatnam (Urban), Visakhapatnam, Andhra Pradesh, 530001, India','Vishakapatnam','Andhra Pradesh','530001','2025-08-01 15:43:18','2025-09-25 06:19:19'),(4,5,'permanent','Khammam, Khammam Urban mandal, Khammam','Khammam','Telangana','507168','2025-08-02 05:00:45','2025-08-02 12:47:46'),(5,6,'permanent','2-5 Thimmaraopeta','Khammam','Telangana ','507168','2025-08-02 13:17:08','2025-08-02 13:21:21'),(6,7,'permanent','nad','Visakhapatnam','Andhra pradesh','530027','2025-09-15 10:20:16','2025-09-15 10:21:27'),(7,8,'permanent','Rk beach','Visakhapatnam','Andhra Pradesh','530027','2025-09-15 10:33:27','2025-09-15 10:33:27'),(8,9,'permanent','nad','visakhapatnam','Andhra Pradesh','530027','2025-09-28 21:40:10','2025-09-28 21:40:10'),(9,10,'permanent','nad','visakhapatnam','Andhra Pradesh','530027','2025-09-28 21:42:52','2025-09-28 21:42:52'),(10,11,'permanent','nad','visakhapatnam','Andhra Pradesh','530027','2025-09-28 21:45:27','2025-09-28 21:45:27');
/*!40000 ALTER TABLE `provider_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_banking_details`
--

DROP TABLE IF EXISTS `provider_banking_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_banking_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `account_holder_name` varchar(100) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `ifsc_code` varchar(11) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `branch_name` varchar(100) DEFAULT NULL,
  `account_type` enum('savings','current') DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('unverified','verified','rejected','archived') NOT NULL DEFAULT 'unverified',
  `verification_remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_account` (`provider_id`,`account_number`),
  CONSTRAINT `provider_banking_details_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_banking_details`
--

LOCK TABLES `provider_banking_details` WRITE;
/*!40000 ALTER TABLE `provider_banking_details` DISABLE KEYS */;
INSERT INTO `provider_banking_details` VALUES (1,2,'Tulasi Ram','1234567890144','SBI000045','SBI','USA,miami','savings',1,'verified','crt','2025-08-19 09:57:25','2025-08-20 09:39:56'),(2,9,'Tulasi ','741852963053','SBI000034','State bank of india','vizag','savings',1,'unverified',NULL,'2025-09-28 22:24:06','2025-09-28 22:24:06');
/*!40000 ALTER TABLE `provider_banking_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_data`
--

DROP TABLE IF EXISTS `provider_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_data` (
  `provider_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT 'FK to the original users table id',
  `full_name` varchar(100) NOT NULL COMMENT 'From users.name',
  `email` varchar(100) NOT NULL COMMENT 'From users.email',
  `phone_number` varchar(15) NOT NULL COMMENT 'From users.phone_number',
  `bio` text,
  `profile_picture_url` varchar(255) DEFAULT NULL,
  `permanent_address` varchar(255) DEFAULT NULL,
  `alternate_email` varchar(100) DEFAULT NULL,
  `alternate_phone_number` varchar(15) DEFAULT NULL,
  `emergency_contact_name` varchar(100) DEFAULT NULL,
  `emergency_contact_relationship` varchar(50) DEFAULT NULL,
  `emergency_contact_phone` varchar(15) DEFAULT NULL,
  `experience_years` int DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0' COMMENT 'Admin verified provider',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Provider is active on the platform',
  `last_active_at` timestamp NULL DEFAULT NULL,
  `service_radius_km` int DEFAULT NULL,
  `current_location_lat` decimal(10,8) DEFAULT NULL,
  `current_location_lng` decimal(11,8) DEFAULT NULL,
  `driver_license_number` varchar(50) DEFAULT NULL,
  `driver_license_expiry_date` date DEFAULT NULL,
  `vehicles` json DEFAULT NULL COMMENT 'Array of vehicle objects, e.g., [{"make": "Toyota", "model": "Innova", "reg_no": "MH12AB1234"}, ...]',
  `qualifications` json DEFAULT NULL COMMENT 'Array of qualification objects, e.g., [{"name": "ITI Diploma", "institution": "Govt. Polytechnic"}, ...]',
  `documents` json DEFAULT NULL COMMENT 'Array of document objects, e.g., [{"type": "identity_proof", "url": "...", "status": "approved"}, ...]',
  `primary_bank_account_holder_name` varchar(100) DEFAULT NULL,
  `primary_bank_account_number` varchar(50) DEFAULT NULL,
  `primary_bank_ifsc_code` varchar(11) DEFAULT NULL,
  `primary_bank_name` varchar(100) DEFAULT NULL,
  `primary_bank_account_type` enum('savings','current') DEFAULT NULL,
  `primary_bank_status` enum('unverified','verified','rejected','archived') DEFAULT 'unverified',
  `notify_on_job_alerts` tinyint(1) DEFAULT '1',
  `notify_on_messages` tinyint(1) DEFAULT '1',
  `auto_accept_jobs` tinyint(1) DEFAULT '0',
  `max_jobs_per_day` int DEFAULT NULL,
  `profile_visibility` enum('public','platform_only') DEFAULT 'platform_only',
  `location_sharing_mode` enum('on_job','always_on','off') DEFAULT 'on_job',
  `preferred_language` varchar(10) DEFAULT 'en-US',
  `preferred_currency` varchar(3) DEFAULT 'INR',
  `distance_unit` enum('km','miles') DEFAULT 'km',
  `acquisition_source` varchar(100) DEFAULT NULL,
  `referrer_provider_id` int DEFAULT NULL,
  `business_type` enum('individual','small_business','company') DEFAULT 'individual',
  `can_be_featured` tinyint(1) DEFAULT '0',
  `willing_to_offer_promos` tinyint(1) DEFAULT '0',
  `provider_tier` enum('Bronze','Silver','Gold','Platinum') DEFAULT NULL,
  `services_offered` json DEFAULT NULL COMMENT 'Array of service objects with pricing, e.g., [{"subcategory_id": 5, "name": "AC Repair", "pricing_model": "per_hour", "rate": 500}, ...]',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`provider_id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone_number` (`phone_number`),
  KEY `email_2` (`email`),
  KEY `phone_number_2` (`phone_number`),
  KEY `is_active` (`is_active`,`is_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_data`
--

LOCK TABLES `provider_data` WRITE;
/*!40000 ALTER TABLE `provider_data` DISABLE KEYS */;
/*!40000 ALTER TABLE `provider_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_documents`
--

DROP TABLE IF EXISTS `provider_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `document_type` enum('identity_proof','address_proof','drivers_license','trade_certificate','background_check','vehicle_registration') NOT NULL,
  `document_url` varchar(255) NOT NULL COMMENT 'URL to the stored file (e.g., on S3)',
  `status` enum('pending_review','approved','rejected') NOT NULL DEFAULT 'pending_review',
  `remarks` text COMMENT 'Reason for rejection by admin',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `provider_documents_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_documents`
--

LOCK TABLES `provider_documents` WRITE;
/*!40000 ALTER TABLE `provider_documents` DISABLE KEYS */;
INSERT INTO `provider_documents` VALUES (1,2,'identity_proof','provider_documents/2/1757931134221_7-1755597471654-569709826.jpg','approved',NULL,'2025-08-19 09:57:51','2025-08-20 09:38:13'),(4,2,'drivers_license','/uploads/provider_documents/7-1755683753804-701530268.jpg','pending_review',NULL,'2025-08-20 09:55:53',NULL),(5,2,'identity_proof','provider_documents/2/1757929621340_7-1757926386021-608801148.jpg','approved',NULL,'2025-09-15 08:53:06','2025-09-15 09:35:00'),(6,2,'address_proof','provider_documents/2/1757929578639_7-1757926886636-930678046.jpg','approved',NULL,'2025-09-15 09:01:26','2025-09-15 09:46:54'),(9,2,'identity_proof','provider_documents/2/1757929640042_Mid_1_Question_Bank_1_.pdf','pending_review',NULL,'2025-09-15 09:47:20',NULL),(10,9,'identity_proof','provider_documents/9/1759096018525_Screenshot_2025-09-22_174558.png','approved',NULL,'2025-09-28 21:46:58','2025-09-28 22:24:33');
/*!40000 ALTER TABLE `provider_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_earnings`
--

DROP TABLE IF EXISTS `provider_earnings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_earnings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `booking_id` int NOT NULL,
  `final_fare` decimal(10,2) NOT NULL,
  `platform_commission` decimal(10,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `provider_earnings` decimal(10,2) NOT NULL,
  `commission_percentage` decimal(5,2) NOT NULL,
  `gst_percentage` decimal(5,2) NOT NULL,
  `bonus_amount` decimal(10,2) DEFAULT '0.00',
  `penalty_amount` decimal(10,2) DEFAULT '0.00',
  `net_earnings` decimal(10,2) GENERATED ALWAYS AS (((`provider_earnings` + `bonus_amount`) - `penalty_amount`)) STORED,
  `payout_status` enum('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
  `payout_date` date DEFAULT NULL,
  `payout_reference` varchar(100) DEFAULT NULL,
  `calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_provider_booking_earnings` (`provider_id`,`booking_id`),
  KEY `idx_provider_earnings` (`provider_id`,`calculated_at`),
  KEY `idx_payout_status` (`payout_status`),
  KEY `fk_earnings_booking` (`booking_id`),
  KEY `idx_provider_earnings_date_range` (`provider_id`,`calculated_at`,`payout_status`),
  KEY `idx_provider_earnings_amount` (`provider_earnings`,`payout_status`),
  CONSTRAINT `fk_earnings_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_earnings_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_earnings`
--

LOCK TABLES `provider_earnings` WRITE;
/*!40000 ALTER TABLE `provider_earnings` DISABLE KEYS */;
/*!40000 ALTER TABLE `provider_earnings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_location_logs`
--

DROP TABLE IF EXISTS `provider_location_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_location_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `provider_location_logs_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_location_logs`
--

LOCK TABLES `provider_location_logs` WRITE;
/*!40000 ALTER TABLE `provider_location_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `provider_location_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_qualifications`
--

DROP TABLE IF EXISTS `provider_qualifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_qualifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `qualification_name` varchar(150) NOT NULL COMMENT 'e.g., ITI Diploma in Electrical, Certified Pest Control Operator',
  `issuing_institution` varchar(150) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `certificate_number` varchar(100) DEFAULT NULL,
  `certificate_url` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  KEY `idx_provider_qualifications_provider_status` (`provider_id`,`status`),
  CONSTRAINT `provider_qualifications_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_qualifications`
--

LOCK TABLES `provider_qualifications` WRITE;
/*!40000 ALTER TABLE `provider_qualifications` DISABLE KEYS */;
INSERT INTO `provider_qualifications` VALUES (1,2,'10 pass','sri viswa','2019-07-19','192023938',NULL,NULL,NULL,'2025-09-28 22:15:41','2025-09-28 22:15:41'),(2,9,'10 certificate','bhashyam','2019-07-28','1957567746','provider_qualifications/9/1759097648277_Screenshot_2025-09-29_020124.png','approved',NULL,'2025-09-28 22:15:41','2025-09-28 22:23:06');
/*!40000 ALTER TABLE `provider_qualifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_services`
--

DROP TABLE IF EXISTS `provider_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_services` (
  `prov_serv_id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `subcategory_id` int NOT NULL,
  PRIMARY KEY (`prov_serv_id`),
  UNIQUE KEY `provider_id` (`provider_id`,`subcategory_id`),
  KEY `subcategory_id` (`subcategory_id`),
  CONSTRAINT `provider_services_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `provider_services_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_services`
--

LOCK TABLES `provider_services` WRITE;
/*!40000 ALTER TABLE `provider_services` DISABLE KEYS */;
INSERT INTO `provider_services` VALUES (21,1,25),(23,1,27),(1,1,34),(28,2,25),(30,2,27),(2,2,67),(6,3,25),(8,3,27),(33,4,25),(35,4,27),(41,5,28),(40,5,29),(43,5,31),(38,5,32),(42,5,33),(39,5,34),(44,5,59),(45,5,61),(46,6,30),(47,6,33),(48,7,32),(49,7,67),(51,8,84),(50,8,85),(56,9,28),(57,9,29),(55,9,30),(58,9,31),(52,9,32),(54,9,33),(53,9,34),(63,10,28),(64,10,29),(62,10,30),(65,10,31),(59,10,32),(61,10,33),(60,10,34),(70,11,28),(71,11,29),(69,11,30),(72,11,31),(66,11,32),(68,11,33),(67,11,34);
/*!40000 ALTER TABLE `provider_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provider_settings`
--

DROP TABLE IF EXISTS `provider_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provider_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `notify_on_job_alerts` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Toggle for new job opportunities',
  `notify_on_messages` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Toggle for messages from users/admins',
  `notify_on_payments` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Toggle for payment confirmations',
  `notify_by_sms` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Opt-in for SMS notifications',
  `notify_by_push` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Opt-in for mobile push notifications',
  `auto_accept_jobs` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Automatically accept jobs that match criteria',
  `max_jobs_per_day` int DEFAULT NULL COMMENT 'Limit on number of jobs per day',
  `allow_weekend_work` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Willing to work on weekends',
  `allow_holiday_work` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Willing to work on public holidays',
  `profile_visibility` enum('public','platform_only') NOT NULL DEFAULT 'platform_only' COMMENT 'Who can see the profile',
  `display_rating` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Allow public display of their rating',
  `allow_direct_contact` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Allow users to contact before booking',
  `location_sharing_mode` enum('on_job','always_on','off') NOT NULL DEFAULT 'on_job' COMMENT 'Controls when location is shared',
  `preferred_language` varchar(10) NOT NULL DEFAULT 'en-US' COMMENT 'e.g., en-US, es-MX',
  `preferred_currency` varchar(3) NOT NULL DEFAULT 'INR' COMMENT 'e.g., INR, USD, CAD',
  `distance_unit` enum('km','miles') NOT NULL DEFAULT 'km',
  `time_format` enum('12h','24h') NOT NULL DEFAULT '24h',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `working_hours_start` time DEFAULT NULL,
  `working_hours_end` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `provider_id` (`provider_id`),
  CONSTRAINT `provider_settings_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_settings`
--

LOCK TABLES `provider_settings` WRITE;
/*!40000 ALTER TABLE `provider_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `provider_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `providers`
--

DROP TABLE IF EXISTS `providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `providers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `experience_years` int DEFAULT '0',
  `rating` decimal(3,2) DEFAULT '0.00',
  `bio` text,
  `verified` tinyint(1) DEFAULT '0',
  `active` tinyint(1) DEFAULT '1',
  `last_active_at` timestamp NULL DEFAULT NULL,
  `service_radius_km` int DEFAULT '10',
  `location_lat` decimal(10,8) DEFAULT NULL,
  `location_lng` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `alternate_email` varchar(100) DEFAULT NULL COMMENT 'Secondary email for account recovery',
  `alternate_phone_number` varchar(15) DEFAULT NULL COMMENT 'Secondary phone for account recovery',
  `emergency_contact_name` varchar(100) DEFAULT NULL COMMENT 'Full name of the emergency contact',
  `emergency_contact_relationship` varchar(50) DEFAULT NULL COMMENT 'Relationship of the emergency contact (e.g., Spouse, Parent)',
  `emergency_contact_phone` varchar(15) DEFAULT NULL COMMENT 'Phone number of the emergency contact',
  `average_rating` decimal(3,2) DEFAULT '0.00',
  `rating_count` int DEFAULT '0',
  `total_ratings` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `providers`
--

LOCK TABLES `providers` WRITE;
/*!40000 ALTER TABLE `providers` DISABLE KEYS */;
INSERT INTO `providers` VALUES (1,4,1,0.00,'Messi Koduku ni raa Saaleeeee',1,1,'2025-08-02 06:07:14',10,17.23170000,80.18260000,'2025-07-30 07:45:19','2025-08-02 06:07:14','messikoduku@gmail.com','6969696969','worker pilagadu','child','9876543210',0.00,0,0),(2,7,2,0.00,'hi there, best bathroom cleaner here',1,1,'2025-09-28 16:28:18',100,17.24653510,80.15003260,'2025-08-01 04:04:00','2025-09-28 16:28:18','suhail.mscellpoint@gmail.com','09666339939','Suhail','friend','9666339939',4.50,0,2),(3,8,1,0.00,'Experienced driver, zero cut on Nehru ORR',1,1,'2025-08-01 14:39:12',100,17.24653510,80.15003260,'2025-08-01 13:50:13','2025-08-20 09:50:58','suhail.mscellpoint@gmail.com','09666339939','driver tammudu','friend','01234567890',0.00,0,0),(4,9,1,0.00,'thop driver',1,1,'2025-09-28 21:14:34',10,17.72148220,83.29009770,'2025-08-01 15:43:18','2025-09-28 21:14:34','tulasi@gmail.com','7894561230','tulasi ram ','friend','7894561230',0.00,0,0),(5,10,5,0.00,'Best carpenter and AC Mechanic',1,1,'2025-08-02 13:23:01',50,17.24653510,80.15003260,'2025-08-02 05:00:45','2025-08-02 13:23:01','mittalmawa@gmail.com','09666339939','tulasi ram ','friend','7894561230',0.00,0,0),(6,11,2,0.00,'bio ',1,1,'2025-08-02 13:24:11',50,17.24653510,80.15003260,'2025-08-02 13:17:08','2025-08-02 13:24:11','test21@gmail.com','7418259630','messi@gmail.com','friend','7418529630',0.00,0,0),(7,15,2,0.00,'[pohjgcfcx',1,1,'2025-09-15 10:22:21',10,17.74414730,83.23640220,'2025-09-15 10:20:16','2025-09-15 10:34:10','tulasi@gmail.com','7894561230','suddapusa','relative','741529630',0.00,0,0),(8,16,4,0.00,'safasf',1,1,'2025-09-15 10:34:06',100,17.71136100,83.31776780,'2025-09-15 10:33:27','2025-09-15 10:34:06','messi@gmail.com','7894561230','messi','friend','741085209666',0.00,0,0),(9,17,1,0.00,'I am a good carperter, have 10 years of experience in door design, window design, furniture design including all the other wood works. Have professional experience for 10 years.',1,1,'2025-09-28 22:57:14',100,17.74414730,83.23640220,'2025-09-28 21:40:10','2025-09-28 22:57:14','messi@gmail.com','7418529630','messi','friend','7418529630',0.00,0,0),(10,17,1,0.00,'I am a good carperter, have 10 years of experience in door design, window design, furniture design including all the other wood works. Have professional experience for 10 years.',1,1,'2025-09-28 22:57:14',100,17.74414730,83.23640220,'2025-09-28 21:42:52','2025-09-28 22:57:14','messi@gmail.com','7418529630','messi','friend','7418529630',0.00,0,0),(11,17,1,0.00,'I am a good carperter, have 10 years of experience in door design, window design, furniture design including all the other wood works. Have professional experience for 10 years.',1,1,'2025-09-28 22:57:14',100,17.74414730,83.23640220,'2025-09-28 21:45:27','2025-09-28 22:57:14','messi@gmail.com','7418529630','messi','friend','7418529630',0.00,0,0);
/*!40000 ALTER TABLE `providers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `rater_id` int NOT NULL,
  `ratee_id` int NOT NULL,
  `ratee_type` enum('customer','provider') NOT NULL,
  `rating` decimal(2,1) NOT NULL,
  `review` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rating` (`booking_id`,`rater_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_chk_1` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratings`
--

LOCK TABLES `ratings` WRITE;
/*!40000 ALTER TABLE `ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ride_bookings`
--

DROP TABLE IF EXISTS `ride_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ride_bookings` (
  `booking_id` int NOT NULL,
  `with_vehicle` tinyint(1) DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `pickup_address` varchar(255) DEFAULT NULL,
  `pickup_lat` decimal(10,8) DEFAULT NULL,
  `pickup_lon` decimal(11,8) DEFAULT NULL,
  `drop_address` varchar(255) DEFAULT NULL,
  `drop_lat` decimal(10,8) DEFAULT NULL,
  `drop_lon` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  CONSTRAINT `fk_ride_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ride_bookings`
--

LOCK TABLES `ride_bookings` WRITE;
/*!40000 ALTER TABLE `ride_bookings` DISABLE KEYS */;
INSERT INTO `ride_bookings` VALUES (2,1,NULL,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580,'Khammam, Telangana, India',17.17291890,80.40575370),(3,1,NULL,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580,'Khammam, Telangana, India',17.17291890,80.40575370),(4,1,NULL,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260),(5,1,NULL,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260),(6,1,NULL,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260,'Hyderabad, Telangana, India',17.38878590,78.46106470),(8,1,NULL,'Vishakapatnam Ralway Station, Railway New Colony, Visakhapatnam, Visakhapatnam (Urban), Visakhapatnam, Andhra Pradesh, 530001, India',17.72148220,83.29009770,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260),(9,1,NULL,'Vishakapatnam Ralway Station, Railway New Colony, Visakhapatnam, Visakhapatnam (Urban), Visakhapatnam, Andhra Pradesh, 530001, India',17.72148220,83.29009770,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260),(10,1,NULL,'Vishakapatnam Ralway Station, Railway New Colony, Visakhapatnam, Visakhapatnam (Urban), Visakhapatnam, Andhra Pradesh, 530001, India',17.72148220,83.29009770,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260),(11,1,NULL,'Vishakapatnam Ralway Station, Railway New Colony, Visakhapatnam, Visakhapatnam (Urban), Visakhapatnam, Andhra Pradesh, 530001, India',17.72148220,83.29009770,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260),(12,1,NULL,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260,'Visakhapatnam, Visakhapatnam (Urban), Visakhapatnam, Andhra Pradesh, 530001, India',17.69355260,83.29212970),(13,1,NULL,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260,'Visakhapatnam, Visakhapatnam (Urban), Visakhapatnam, Andhra Pradesh, 530001, India',17.69355260,83.29212970),(14,1,NULL,'Delhi, India',28.63280270,77.21977130,'Mumbai, Maharashtra, India',19.05499900,72.86920350),(15,1,NULL,'Mumbai, Maharashtra, India',19.05499900,72.86920350,'Hyderabad, Bahadurpura mandal, Hyderabad, Telangana, India',17.36058900,78.47406130),(16,1,NULL,'Hyderabad, Bahadurpura mandal, Hyderabad, Telangana, India',17.36058900,78.47406130,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580),(17,1,NULL,'Pandurangapuram, Khammam Urban mandal, Khammam, Telangana, 507002, India',17.27357790,80.17890230,'Bhadrachalam Road, NH30, Kothagudem, Kothagudem mandal, Bhadradri Kothagudem, Telangana, 507101, India',17.55129160,80.61445350),(25,1,NULL,'తిమ్మారావుపేట, Enkoor mandal, ఖమ్మం, Telangana, India',17.37392240,80.36608580,'Visakhapatnam, విశాఖపట్నం (పట్టణ), విశాఖపట్నం, Andhra Pradesh, 530001, India',17.69355260,83.29212970),(30,1,NULL,'తిమ్మారావుపేట, Enkoor mandal, ఖమ్మం, Telangana, India',17.37392240,80.36608580,'Hyderabad, Bahadurpura mandal, హైదరాబాదు, Telangana, India',17.36058900,78.47406130),(53,1,NULL,'తిమ్మారావుపేట, Enkoor mandal, ఖమ్మం, Telangana, India',17.37392240,80.36608580,'Hyderabad, Bahadurpura mandal, హైదరాబాదు, Telangana, India',17.36058900,78.47406130),(62,1,NULL,'తిమ్మారావుపేట, Enkoor mandal, ఖమ్మం, Telangana, India',17.37392240,80.36608580,'Hyderabad, Bahadurpura mandal, హైదరాబాదు, Telangana, India',17.36058900,78.47406130),(63,1,NULL,'తిమ్మారావుపేట, Enkoor mandal, ఖమ్మం, Telangana, India',17.37392240,80.36608580,'Hyderabad, Bahadurpura mandal, హైదరాబాదు, Telangana, India',17.36058900,78.47406130),(70,1,NULL,'Sri Ramnagar, Sri Nagar, Old Gajuwaka, గాజువాక, విశాఖపట్నం, Andhra Pradesh, 530013, India',17.68256085,83.18579984,'NH516E, Ayyannapalem, నర్సీపట్నం, అనకాపల్లి, Andhra Pradesh, 531100, India',17.67779128,82.59335023),(94,0,NULL,'16-146, H Colony, Old Gopalapatnam, Kakani Nagar, Visakhapatanam, Visakhapatnam, Andhra Pradesh 530027, India',17.74171720,83.22553484,'Hyderabad, Telangana, India',17.40649800,78.47724390),(95,0,NULL,'16-146, H Colony, Old Gopalapatnam, Kakani Nagar, Visakhapatanam, Visakhapatnam, Andhra Pradesh 530027, India',17.74172344,83.22552119,'Chennai, Tamil Nadu, India',13.08430070,80.27046220),(96,0,NULL,'16-145/1, Old Gopalapatnam, Kakani Nagar, Visakhapatnam, Andhra Pradesh 530027, India',17.74184164,83.22554087,'Hyderabad, Telangana, India',17.40649800,78.47724390);
/*!40000 ALTER TABLE `ride_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ride_fare_breakdowns`
--

DROP TABLE IF EXISTS `ride_fare_breakdowns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ride_fare_breakdowns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `quote_id` varchar(50) NOT NULL COMMENT 'Unique identifier for the fare quote',
  `vehicle_type_id` int NOT NULL,
  `distance_km_est` decimal(8,2) DEFAULT NULL COMMENT 'Estimated distance in kilometers',
  `time_min_est` decimal(8,2) DEFAULT NULL COMMENT 'Estimated time in minutes',
  `base_fare_est` decimal(8,2) DEFAULT NULL,
  `distance_component_est` decimal(8,2) DEFAULT NULL,
  `time_component_est` decimal(8,2) DEFAULT NULL,
  `surge_component_est` decimal(8,2) DEFAULT NULL,
  `night_component_est` decimal(8,2) DEFAULT NULL,
  `total_fare_est` decimal(8,2) DEFAULT NULL,
  `distance_km_act` decimal(8,2) DEFAULT NULL COMMENT 'Actual distance traveled',
  `time_min_act` decimal(8,2) DEFAULT NULL COMMENT 'Actual time taken',
  `base_fare_act` decimal(8,2) DEFAULT NULL,
  `distance_component_act` decimal(8,2) DEFAULT NULL,
  `time_component_act` decimal(8,2) DEFAULT NULL,
  `surge_component_act` decimal(8,2) DEFAULT NULL,
  `night_component_act` decimal(8,2) DEFAULT NULL,
  `total_fare_act` decimal(8,2) DEFAULT NULL,
  `promo_discount` decimal(8,2) DEFAULT '0.00',
  `tip_amount` decimal(8,2) DEFAULT '0.00',
  `cancellation_fee` decimal(8,2) DEFAULT '0.00',
  `waiting_charges` decimal(8,2) DEFAULT '0.00',
  `toll_charges` decimal(8,2) DEFAULT '0.00',
  `final_fare` decimal(8,2) DEFAULT NULL COMMENT 'Final amount charged to customer',
  `surge_multiplier_applied` decimal(4,2) DEFAULT '1.00',
  `night_hours_applied` tinyint(1) DEFAULT '0',
  `quote_created_at` timestamp NULL DEFAULT NULL,
  `trip_started_at` timestamp NULL DEFAULT NULL,
  `trip_ended_at` timestamp NULL DEFAULT NULL,
  `fare_calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_quote` (`booking_id`,`quote_id`),
  KEY `idx_quote_id` (`quote_id`),
  KEY `idx_vehicle_type` (`vehicle_type_id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_fare_breakdown_quote_created` (`quote_created_at`),
  KEY `idx_fare_breakdown_trip_dates` (`trip_started_at`,`trip_ended_at`),
  CONSTRAINT `fk_fare_breakdown_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fare_breakdown_vehicle_type` FOREIGN KEY (`vehicle_type_id`) REFERENCES `pricing_vehicle_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ride_fare_breakdowns`
--

LOCK TABLES `ride_fare_breakdowns` WRITE;
/*!40000 ALTER TABLE `ride_fare_breakdowns` DISABLE KEYS */;
/*!40000 ALTER TABLE `ride_fare_breakdowns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'customer'),(2,'worker'),(3,'admin'),(4,'super admin');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_area`
--

DROP TABLE IF EXISTS `service_area`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_area` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `provider_id` (`provider_id`,`pincode`),
  CONSTRAINT `service_area_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_area`
--

LOCK TABLES `service_area` WRITE;
/*!40000 ALTER TABLE `service_area` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_area` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_bookings`
--

DROP TABLE IF EXISTS `service_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_bookings` (
  `booking_id` int NOT NULL,
  `address` text NOT NULL,
  PRIMARY KEY (`booking_id`),
  CONSTRAINT `fk_service_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_bookings`
--

LOCK TABLES `service_bookings` WRITE;
/*!40000 ALTER TABLE `service_bookings` DISABLE KEYS */;
INSERT INTO `service_bookings` VALUES (1,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(7,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(18,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(19,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(20,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(21,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(22,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(23,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(24,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(26,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(27,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(28,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(29,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(31,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(32,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(33,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(34,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(35,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(36,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(37,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(38,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(39,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(40,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(41,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(42,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(43,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(44,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(45,'2-5 Thimmaraopeta, Khammam, Telangana - 507168, India'),(46,'Nad, Visakhapatnam, Visakhapatnam, Andhra pradesh - 530027, India'),(47,'2-5 Thimmaraopeta , Khammam, Telangana - 507168, India'),(48,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(49,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(50,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(51,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(52,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(54,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(55,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(56,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(57,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(58,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(59,'2-5 Thimmaraopeta, Khammam,  Telangana - 500012, India'),(60,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(61,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(64,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(65,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(66,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(67,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(68,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(69,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(71,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(72,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(73,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(74,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(87,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(89,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(90,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(91,'2-5 Thimmaraopeta, 123, Khammam,  Telangana - 500012, India'),(97,'Nad, Visakhapatnam, Andhra Pradesh - 530027, India');
/*!40000 ALTER TABLE `service_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_categories`
--

DROP TABLE IF EXISTS `service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `category_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_categories`
--

LOCK TABLES `service_categories` WRITE;
/*!40000 ALTER TABLE `service_categories` DISABLE KEYS */;
INSERT INTO `service_categories` VALUES (17,'Carpenter',1,'maintenance'),(18,'AC Services',1,'maintenance'),(19,'Plumber',1,'maintenance'),(20,'Electrician',1,'maintenance'),(21,'Pest Control',1,'maintenance'),(22,'Cleaner',1,'maid'),(23,'Cook',1,'maid'),(24,'General Help',1,'maid'),(25,'Innova Crysta',1,'driver');
/*!40000 ALTER TABLE `service_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subcategories`
--

DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text,
  `base_price` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_id` (`category_id`,`name`),
  CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategories`
--

LOCK TABLES `subcategories` WRITE;
/*!40000 ALTER TABLE `subcategories` DISABLE KEYS */;
INSERT INTO `subcategories` VALUES (25,'Corporate Travel',25,'Business travel services',3000,1),(27,'Hourly Rental',25,'Vehicle rental by the hour',1800,1),(28,'Kitchen Cabinets',17,'Custom kitchen cabinet installation and repair',5000,1),(29,'Furniture Repair',17,'Repair and restoration of wooden furniture',2000,1),(30,'Door Installation',17,'Door fitting and frame installation',3000,1),(31,'Window Frames',17,'Window frame repair and replacement',3500,1),(32,'Custom Shelving',17,'Custom built-in shelves and storage solutions',4000,1),(33,'Flooring Installation',17,'Wooden flooring installation and repair',6000,1),(34,'Deck Building',17,'Outdoor deck construction and maintenance',8000,1),(56,'Installation',18,'New AC unit installation',3000,1),(57,'Repair & Maintenance',18,'AC troubleshooting and regular maintenance',1500,1),(58,'Gas Refilling',18,'Refrigerant gas refilling service',2500,1),(59,'Cleaning & Servicing',18,'Deep cleaning and servicing of AC units',1200,1),(60,'Duct Cleaning',18,'AC duct cleaning and maintenance',2000,1),(61,'Thermostat Installation',18,'Smart thermostat installation and setup',1800,1),(62,'Pipe Repair',19,'Leaky pipe repair and replacement',1000,1),(63,'Drain Cleaning',19,'Clogged drain cleaning and unblocking',800,1),(64,'Toilet Installation',19,'Toilet fitting and installation',2500,1),(65,'Faucet Repair',19,'Faucet repair and replacement',500,1),(66,'Water Heater Service',19,'Water heater installation and repair',3500,1),(67,'Bathroom Renovation',19,'Complete bathroom plumbing renovation',10000,1),(68,'Emergency Plumbing',19,'24/7 emergency plumbing services',2000,1),(69,'Wiring Installation',20,'Complete house wiring installation',5000,1),(70,'Light Fixture Setup',20,'Light fixture installation and repair',800,1),(71,'Outlet Installation',20,'Electrical outlet and switch installation',600,1),(72,'Circuit Breaker Repair',20,'Circuit breaker troubleshooting and repair',1500,1),(73,'Fan Installation',20,'Ceiling and exhaust fan installation',1000,1),(74,'Electrical Inspection',20,'Complete electrical safety inspection',2000,1),(75,'Emergency Electrical',20,'24/7 emergency electrical services',2500,1),(76,'Termite Treatment',21,'Termite inspection and treatment',3000,1),(77,'Rodent Control',21,'Rat and mouse extermination',2500,1),(78,'Cockroach Treatment',21,'Cockroach elimination service',2000,1),(79,'Ant Control',21,'Ant colony removal and prevention',1800,1),(80,'Bed Bug Treatment',21,'Bed bug extermination service',3500,1),(81,'Mosquito Control',21,'Mosquito fogging and prevention',2200,1),(82,'General Fumigation',21,'Complete home fumigation service',4000,1),(83,'House Cleaning',22,'Standard home cleaning service',1500,1),(84,'Deep Cleaning',22,'Thorough deep cleaning service',3000,1),(85,'Carpet Cleaning',22,'Professional carpet cleaning and nice work',2000,1),(86,'Window Cleaning',22,'Interior/exterior window cleaning',1200,1),(87,'Post-Construction Cleanup',22,'Post-construction debris removal',3500,1),(88,'Office Cleaning',22,'Commercial office cleaning',2500,1),(89,'Move-in/Move-out Cleaning',22,'Complete home cleaning for moving',4000,1),(90,'Daily Meal Prep',23,'Daily home-cooked meal preparation',5000,1),(91,'Party Catering',23,'Event and party catering service',8000,1),(92,'Special Occasion Cooking',23,'Custom meals for special events',6000,1),(93,'Meal Planning',23,'Personalized meal planning service',3000,1),(94,'Cooking Classes',23,'In-home cooking lessons',2000,1),(95,'Diet-specific Meals',23,'Special diet meal preparation',5500,1),(96,'Bulk Cooking',23,'Large quantity meal preparation',7000,1),(97,'Moving Assistance',24,'Help with moving and packing',2500,1),(98,'Furniture Assembly',24,'Furniture assembly and setup',1500,1),(99,'Yard Work',24,'Gardening and yard maintenance',2000,1),(100,'Painting',24,'Interior/exterior painting service',4000,1),(101,'Minor Repairs',24,'Various home repair services',1800,1),(102,'Organizing Services',24,'Home organization and decluttering',3000,1),(103,'Handyman Tasks',24,'Various handyman services',2200,1);
/*!40000 ALTER TABLE `subcategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `surge_zones`
--

DROP TABLE IF EXISTS `surge_zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `surge_zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zone_name` varchar(100) NOT NULL,
  `zone_polygon` polygon NOT NULL COMMENT 'Geographic boundary of the zone',
  `current_surge_multiplier` decimal(4,2) NOT NULL DEFAULT '1.00',
  `demand_index` int NOT NULL DEFAULT '0' COMMENT 'Current demand level (0-100)',
  `active_drivers_count` int NOT NULL DEFAULT '0',
  `pending_requests_count` int NOT NULL DEFAULT '0',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  SPATIAL KEY `idx_zone_polygon` (`zone_polygon`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `surge_zones`
--

LOCK TABLES `surge_zones` WRITE;
/*!40000 ALTER TABLE `surge_zones` DISABLE KEYS */;
/*!40000 ALTER TABLE `surge_zones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_charges`
--

DROP TABLE IF EXISTS `system_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_charges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `charge_type` enum('withdrawal_fee','settlement_fee','platform_fee') NOT NULL,
  `charge_percentage` decimal(5,2) DEFAULT '0.00',
  `fixed_charge` decimal(10,2) DEFAULT '0.00',
  `minimum_charge` decimal(10,2) DEFAULT '0.00',
  `maximum_charge` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_charge_type_date` (`charge_type`,`effective_from`),
  KEY `idx_charges_type` (`charge_type`),
  KEY `idx_charges_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_charges`
--

LOCK TABLES `system_charges` WRITE;
/*!40000 ALTER TABLE `system_charges` DISABLE KEYS */;
INSERT INTO `system_charges` VALUES (1,'withdrawal_fee',2.00,5.00,5.00,50.00,1,'2025-09-21',NULL,'2025-09-21 12:44:55','2025-09-21 12:44:55'),(2,'settlement_fee',1.00,2.00,2.00,25.00,1,'2025-09-21',NULL,'2025-09-21 12:44:55','2025-09-21 12:44:55'),(3,'platform_fee',5.00,0.00,0.00,0.00,1,'2025-09-21',NULL,'2025-09-21 12:44:55','2025-09-21 12:44:55');
/*!40000 ALTER TABLE `system_charges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_location_logs`
--

DROP TABLE IF EXISTS `trip_location_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_location_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `speed_kmh` decimal(5,2) DEFAULT NULL COMMENT 'Speed in km/h if available',
  `bearing` decimal(5,2) DEFAULT NULL COMMENT 'Direction in degrees',
  `accuracy_meters` decimal(6,2) DEFAULT NULL COMMENT 'GPS accuracy in meters',
  `event_type` enum('trip_start','location_update','trip_end','pause','resume') NOT NULL DEFAULT 'location_update',
  `recorded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_provider` (`booking_id`,`provider_id`),
  KEY `idx_recorded_at` (`recorded_at`),
  KEY `fk_trip_log_provider` (`provider_id`),
  CONSTRAINT `fk_trip_log_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trip_log_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_location_logs`
--

LOCK TABLES `trip_location_logs` WRITE;
/*!40000 ALTER TABLE `trip_location_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_location_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `upi_payment_methods`
--

DROP TABLE IF EXISTS `upi_payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `upi_payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `upi_id` varchar(100) NOT NULL,
  `provider_name` varchar(50) NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_upi` (`user_id`,`upi_id`),
  KEY `user_id` (`user_id`),
  KEY `is_default` (`is_default`),
  CONSTRAINT `upi_payment_methods_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `upi_payment_methods`
--

LOCK TABLES `upi_payment_methods` WRITE;
/*!40000 ALTER TABLE `upi_payment_methods` DISABLE KEYS */;
INSERT INTO `upi_payment_methods` VALUES (1,5,'9666339939@phonepe','PhonePe',1,1,'2025-09-15 05:57:31','2025-09-15 08:55:11'),(2,5,'7894561230@okaxis','Axis Bank',0,1,'2025-09-15 05:58:27','2025-09-15 08:55:11');
/*!40000 ALTER TABLE `upi_payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `upi_transactions`
--

DROP TABLE IF EXISTS `upi_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `upi_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `upi_payment_method_id` int NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `upi_transaction_id` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `status` enum('pending','processing','completed','failed','cancelled','refunded') DEFAULT 'pending',
  `payment_gateway_response` json DEFAULT NULL,
  `failure_reason` text,
  `initiated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `user_id` (`user_id`),
  KEY `booking_id` (`booking_id`),
  KEY `upi_payment_method_id` (`upi_payment_method_id`),
  KEY `status` (`status`),
  CONSTRAINT `upi_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `upi_transactions_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `upi_transactions_ibfk_3` FOREIGN KEY (`upi_payment_method_id`) REFERENCES `upi_payment_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `upi_transactions`
--

LOCK TABLES `upi_transactions` WRITE;
/*!40000 ALTER TABLE `upi_transactions` DISABLE KEYS */;
INSERT INTO `upi_transactions` VALUES (1,5,74,1,'TXN_1757926085897_5U48MYLVG',NULL,4000.00,'INR','failed',NULL,NULL,'2025-09-15 08:48:05',NULL,'2025-09-15 08:48:05','2025-09-15 08:48:06'),(2,5,73,1,'TXN_1758441313786_OB96QEVKK',NULL,12390.00,'INR','failed',NULL,NULL,'2025-09-21 07:55:13',NULL,'2025-09-21 07:55:13','2025-09-21 07:55:14'),(3,5,74,1,'TXN_1758441370149_5CBW0ZYIW',NULL,12390.00,'INR','failed',NULL,NULL,'2025-09-21 07:56:10',NULL,'2025-09-21 07:56:10','2025-09-21 07:56:10'),(4,5,74,1,'TXN_1758441433137_8JPAIPGG8',NULL,12390.00,'INR','failed',NULL,NULL,'2025-09-21 07:57:13',NULL,'2025-09-21 07:57:13','2025-09-21 07:57:14'),(5,5,74,1,'TXN_1758441515870_F8QJSOR4F',NULL,12390.00,'INR','failed',NULL,NULL,'2025-09-21 07:58:35',NULL,'2025-09-21 07:58:35','2025-09-21 07:58:36'),(6,5,89,1,'TXN_1758515150413_VDN961XF1',NULL,12390.00,'INR','failed',NULL,NULL,'2025-09-22 04:25:50',NULL,'2025-09-22 04:25:50','2025-09-22 04:25:50');
/*!40000 ALTER TABLE `upi_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_role_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`user_role_id`),
  KEY `user_id` (`user_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (2,2,4),(3,3,3),(4,4,2),(5,5,1),(6,6,3),(7,7,2),(8,8,2),(9,9,2),(10,10,2),(11,11,2),(12,12,1),(13,13,1),(14,14,1),(15,15,2),(16,16,2),(17,17,1),(18,18,1),(21,17,2);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_wallets`
--

DROP TABLE IF EXISTS `user_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_wallet` (`user_id`,`currency`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_wallets`
--

LOCK TABLES `user_wallets` WRITE;
/*!40000 ALTER TABLE `user_wallets` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether the user has verified their email address',
  `email_verified_at` datetime DEFAULT NULL COMMENT 'When the user verified their email address',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `phone_number` varchar(10) DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'super admin','superadmin@otw.com','$2b$10$Y/hsbzGdXiC27mLi3mjE1.R02KZ8zy1SFhsgDFJsr.ODD/zmujxZS',1,0,NULL,'2025-07-30 07:41:08',NULL,'prefer_not_to_say'),(3,'admin','admin@otw.com','$2b$10$YNBUMXyo2RWvlUE3qeA93eu/JGPpko0cBGZIL9B7dZ0RLztKuZNNa',1,0,NULL,'2025-07-30 07:43:57','7894561230','female'),(4,'Messi Gadi  Worker','messikoduku@otw.com','$2b$10$wgK1UNdeDiChC98GTFEu6.kPuldUPzoEw0N3LR/HHbPl6.d90cUii',1,0,NULL,'2025-07-30 07:45:19','7894561230',NULL),(5,'suhail mahamad','suhail@gmail.com','$2b$10$NMHFools5i5H51nnaYtpiuxEOgv5p/jroe1KP6NqH8fFQrBYjOewy',1,1,'2025-09-25 22:49:19','2025-07-30 10:19:11','9666339939','male'),(6,'admin with gender','adminwithgender@otw.com','$2b$10$NgCjRzbG/fVugJmmfkKD4Obxet967ce6151uAn1x4AiO5Mx7rCTVa',1,0,NULL,'2025-07-31 09:17:08','1234567890','male'),(7,'worker test','worker@otw.com','$2b$10$NKLoK3bz4E3haEWN3f7Z5.DRXva/vomRnXtmJ3CCRn4uAc./YicM.',1,0,NULL,'2025-08-01 04:04:00','7418529630','female'),(8,'driver test','driverworker@otw.com','$2b$10$r4zhtN.y2Rox2fYKsIFr7O51bXAr1wMudK/y3WuNRjx8OsX76cxQa',1,0,NULL,'2025-08-01 13:50:13','7894561230',NULL),(9,'vizag worker','vizagworker@otw.com','$2b$10$Lh9oLH5OpImYVKgaicUQe.ozFqggCQCaL/J9kW3lsPjV3uMwsYZGq',1,0,NULL,'2025-08-01 15:43:18','7680007233',NULL),(10,'maintenence worker','maintenence@otw.com','$2b$10$vFdKTRMEgXyuuCO6oBopqOTozWY/c7oZYAykXRTQqkFbCWQAcSSP2',1,0,NULL,'2025-08-02 05:00:45','7485961230',NULL),(11,'test name','maintenence1@otw.com','$2b$10$he2eFZDfSzz.Cr1n2O2.veQc9z5jsTd.r8genX7hvsHmkZ3dIN0U.',1,0,NULL,'2025-08-02 13:17:08','7418529630',NULL),(12,'Tulasi  ram','tulasi@gmail.com','$2b$10$Ax2pz8OFD2tY/poDXLoKQObFKR3GZ5iwY2IEuobekFjnlHzBVUJka',1,0,NULL,'2025-08-13 10:29:25',NULL,NULL),(13,'tulasiram M','tulasiram@gmail.com','$2b$10$TecmrqYrN3iBl05.GzvBmeBzm0aEO06jhLTzcXfAsScKamvGRUDtW',1,0,NULL,'2025-08-13 10:41:45',NULL,NULL),(14,'Tulasi ram M','tulasiram0915@gmail.com','$2b$10$AyW3YbsfU31nN65CdCgYKOI1OrvFFVJIrkKVms5TDw/KKrmARJW0C',1,1,'2025-09-26 00:12:34','2025-08-28 05:38:37',NULL,NULL),(15,'Mworker leo','Mworker@otw.com','$2b$10$gEwHF/jI7R6oP09EmaXlF.SOGTBypjnFnhEnXyFrD/TjkS/NOFAtm',1,0,NULL,'2025-09-15 10:20:16','7894561230',NULL),(16,'neyworker santos','Neymarjrr@gmail.com','$2b$10$xVEuMXDKnYv9I1ymLS8fUOqZFnYiqivpxTPPlufHhvzpZHoWPupiO',1,0,NULL,'2025-09-15 10:33:27','7680007233',NULL),(17,'Tulasi Test','tulasi12115045@gmail.com','$2b$10$Vg0DDxojFOei8yuHayPfBuo39Fh3ulRU4MZf5GtFtZs023oBa6sie',1,1,'2025-09-25 23:51:38','2025-09-25 17:59:33','1234567890',NULL),(18,'Tulasi ram','tulasirammadaka403@gmail.com','$2b$10$IPzvtBeTy.XeRtt76uELh.CPlx4blNZmLadphOKij4T/TwUReeBWa',1,1,'2025-09-26 14:57:18','2025-09-26 09:26:57','7894561230','female');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_active_chat_sessions`
--

DROP TABLE IF EXISTS `v_active_chat_sessions`;
/*!50001 DROP VIEW IF EXISTS `v_active_chat_sessions`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_active_chat_sessions` AS SELECT 
 1 AS `session_id`,
 1 AS `booking_id`,
 1 AS `customer_id`,
 1 AS `provider_id`,
 1 AS `message_count`,
 1 AS `last_message_at`,
 1 AS `created_at`,
 1 AS `customer_name`,
 1 AS `customer_phone`,
 1 AS `provider_name`,
 1 AS `provider_phone`,
 1 AS `service_status`,
 1 AS `booking_type`,
 1 AS `service_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_user_unread_counts`
--

DROP TABLE IF EXISTS `v_user_unread_counts`;
/*!50001 DROP VIEW IF EXISTS `v_user_unread_counts`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_user_unread_counts` AS SELECT 
 1 AS `user_id`,
 1 AS `user_type`,
 1 AS `unread_count`,
 1 AS `last_unread_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL COMMENT 'The provider who owns/operates this vehicle',
  `make` varchar(50) NOT NULL COMMENT 'e.g., Toyota, Maruti Suzuki, Ford',
  `model` varchar(50) NOT NULL COMMENT 'e.g., Innova Crysta, Swift, Ecosport',
  `year` int NOT NULL,
  `color` varchar(30) DEFAULT NULL,
  `registration_number` varchar(20) NOT NULL,
  `vehicle_type` enum('sedan','suv','hatchback','bike','van') NOT NULL,
  `insurance_policy_number` varchar(50) DEFAULT NULL,
  `insurance_expiry_date` date DEFAULT NULL,
  `fitness_certificate_expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Is this vehicle currently in use on the platform?',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registration_number` (`registration_number`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_promotions`
--

DROP TABLE IF EXISTS `wallet_promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_promotions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `promotion_name` varchar(100) NOT NULL,
  `promotion_type` enum('cashback','bonus','discount') NOT NULL,
  `min_topup_amount` decimal(10,2) DEFAULT '0.00',
  `bonus_percentage` decimal(5,2) DEFAULT '0.00',
  `bonus_amount` decimal(10,2) DEFAULT '0.00',
  `max_bonus_amount` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `valid_from` date NOT NULL,
  `valid_to` date NOT NULL,
  `usage_limit` int DEFAULT '0',
  `used_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promotions_active` (`is_active`),
  KEY `idx_promotions_validity` (`valid_from`,`valid_to`),
  KEY `idx_promotions_type` (`promotion_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_promotions`
--

LOCK TABLES `wallet_promotions` WRITE;
/*!40000 ALTER TABLE `wallet_promotions` DISABLE KEYS */;
/*!40000 ALTER TABLE `wallet_promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_refunds`
--

DROP TABLE IF EXISTS `wallet_refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `wallet_id` int NOT NULL,
  `booking_id` int NOT NULL,
  `refund_amount` decimal(10,2) NOT NULL,
  `refund_reason` text,
  `refund_status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `admin_notes` text,
  `processed_by` int DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wallet_id` (`wallet_id`),
  KEY `processed_by` (`processed_by`),
  KEY `idx_refund_customer` (`customer_id`),
  KEY `idx_refund_booking` (`booking_id`),
  KEY `idx_refund_status` (`refund_status`),
  CONSTRAINT `wallet_refunds_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wallet_refunds_ibfk_2` FOREIGN KEY (`wallet_id`) REFERENCES `customer_wallets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wallet_refunds_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wallet_refunds_ibfk_4` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_refunds`
--

LOCK TABLES `wallet_refunds` WRITE;
/*!40000 ALTER TABLE `wallet_refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `wallet_refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_settings`
--

DROP TABLE IF EXISTS `wallet_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_setting_key` (`setting_key`),
  KEY `idx_wallet_settings_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_settings`
--

LOCK TABLES `wallet_settings` WRITE;
/*!40000 ALTER TABLE `wallet_settings` DISABLE KEYS */;
INSERT INTO `wallet_settings` VALUES (1,'min_topup_amount','100.00','Minimum amount for wallet top-up',1,'2025-09-22 03:29:26','2025-09-22 03:29:26'),(2,'max_topup_amount','50000.00','Maximum amount for wallet top-up',1,'2025-09-22 03:29:26','2025-09-22 03:29:26'),(3,'min_wallet_balance','0.00','Minimum wallet balance allowed',1,'2025-09-22 03:29:26','2025-09-22 03:29:26'),(4,'max_wallet_balance','100000.00','Maximum wallet balance allowed',1,'2025-09-22 03:29:26','2025-09-22 03:29:26'),(5,'wallet_payment_enabled','true','Enable wallet payments for bookings',1,'2025-09-22 03:29:26','2025-09-22 03:29:26'),(6,'auto_refund_to_wallet','true','Automatically refund to wallet for cancellations',1,'2025-09-22 03:29:26','2025-09-22 03:29:26'),(7,'wallet_expiry_days','365','Wallet balance expiry in days (0 for no expiry)',1,'2025-09-22 03:29:26','2025-09-22 03:29:26');
/*!40000 ALTER TABLE `wallet_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_topup_requests`
--

DROP TABLE IF EXISTS `wallet_topup_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_topup_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `wallet_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `razorpay_order_id` varchar(100) DEFAULT NULL,
  `razorpay_payment_id` varchar(100) DEFAULT NULL,
  `topup_status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
  `failure_reason` text,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wallet_id` (`wallet_id`),
  KEY `idx_topup_customer` (`customer_id`),
  KEY `idx_topup_status` (`topup_status`),
  CONSTRAINT `wallet_topup_requests_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wallet_topup_requests_ibfk_2` FOREIGN KEY (`wallet_id`) REFERENCES `customer_wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_topup_requests`
--

LOCK TABLES `wallet_topup_requests` WRITE;
/*!40000 ALTER TABLE `wallet_topup_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `wallet_topup_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL COMMENT 'Positive for credit, negative for debit',
  `transaction_type` enum('credit','debit','refund','fare_adjustment','bonus','penalty','withdrawal') NOT NULL,
  `description` text,
  `balance_before` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `reference_id` varchar(100) DEFAULT NULL COMMENT 'External reference (Razorpay, bank, etc.)',
  `status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_transactions` (`user_id`,`created_at`),
  KEY `idx_booking_transactions` (`booking_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_wallet_transactions_date_range` (`user_id`,`created_at`,`transaction_type`),
  KEY `idx_wallet_transactions_amount` (`amount`,`transaction_type`),
  CONSTRAINT `fk_wallet_transaction_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wallet_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `withdrawal_requests`
--

DROP TABLE IF EXISTS `withdrawal_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `withdrawal_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `wallet_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `withdrawal_charges` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL,
  `upi_id` varchar(100) NOT NULL,
  `request_status` enum('pending','approved','processing','completed','rejected','failed') DEFAULT 'pending',
  `admin_notes` text,
  `razorpay_payout_id` varchar(100) DEFAULT NULL,
  `failure_reason` text,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  KEY `wallet_id` (`wallet_id`),
  KEY `idx_withdrawal_worker` (`worker_id`),
  KEY `idx_withdrawal_status` (`request_status`),
  KEY `idx_withdrawal_created` (`created_at`),
  CONSTRAINT `withdrawal_requests_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `withdrawal_requests_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `withdrawal_requests_ibfk_3` FOREIGN KEY (`wallet_id`) REFERENCES `worker_wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawal_requests`
--

LOCK TABLES `withdrawal_requests` WRITE;
/*!40000 ALTER TABLE `withdrawal_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `withdrawal_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `worker_upi_details`
--

DROP TABLE IF EXISTS `worker_upi_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `worker_upi_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `upi_id` varchar(100) NOT NULL,
  `upi_provider` varchar(50) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `is_verified` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_worker_upi` (`worker_id`,`upi_id`),
  KEY `provider_id` (`provider_id`),
  KEY `idx_worker_upi_primary` (`worker_id`,`is_primary`),
  KEY `idx_worker_upi_active` (`is_active`),
  CONSTRAINT `worker_upi_details_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `worker_upi_details_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `worker_upi_details`
--

LOCK TABLES `worker_upi_details` WRITE;
/*!40000 ALTER TABLE `worker_upi_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `worker_upi_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `worker_wallets`
--

DROP TABLE IF EXISTS `worker_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `worker_wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `current_balance` decimal(10,2) DEFAULT '0.00',
  `total_earned` decimal(10,2) DEFAULT '0.00',
  `total_withdrawn` decimal(10,2) DEFAULT '0.00',
  `total_settled` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_worker_wallet` (`worker_id`),
  KEY `idx_worker_wallet_provider` (`provider_id`),
  KEY `idx_worker_wallet_active` (`is_active`),
  CONSTRAINT `worker_wallets_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `worker_wallets_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `worker_wallets`
--

LOCK TABLES `worker_wallets` WRITE;
/*!40000 ALTER TABLE `worker_wallets` DISABLE KEYS */;
/*!40000 ALTER TABLE `worker_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `customer_wallet_summary`
--

/*!50001 DROP VIEW IF EXISTS `customer_wallet_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `customer_wallet_summary` AS select `cw`.`id` AS `wallet_id`,`cw`.`customer_id` AS `customer_id`,`u`.`name` AS `customer_name`,`u`.`phone_number` AS `customer_phone`,`u`.`email` AS `customer_email`,`cw`.`current_balance` AS `current_balance`,`cw`.`total_added` AS `total_added`,`cw`.`total_spent` AS `total_spent`,`cw`.`total_refunded` AS `total_refunded`,`cw`.`is_active` AS `is_active`,`cw`.`created_at` AS `created_at`,`cw`.`updated_at` AS `updated_at` from ((`customer_wallets` `cw` join `customers` `c` on((`cw`.`customer_id` = `c`.`id`))) join `users` `u` on((`c`.`id` = `u`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_active_chat_sessions`
--

/*!50001 DROP VIEW IF EXISTS `v_active_chat_sessions`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_active_chat_sessions` AS select `cs`.`id` AS `session_id`,`cs`.`booking_id` AS `booking_id`,`cs`.`customer_id` AS `customer_id`,`cs`.`provider_id` AS `provider_id`,`cs`.`message_count` AS `message_count`,`cs`.`last_message_at` AS `last_message_at`,`cs`.`created_at` AS `created_at`,`cu`.`name` AS `customer_name`,`cu`.`phone_number` AS `customer_phone`,`pu`.`name` AS `provider_name`,`pu`.`phone_number` AS `provider_phone`,`b`.`service_status` AS `service_status`,`b`.`booking_type` AS `booking_type`,`sc`.`name` AS `service_name` from ((((`chat_sessions` `cs` join `users` `cu` on((`cs`.`customer_id` = `cu`.`id`))) join `users` `pu` on((`cs`.`provider_id` = `pu`.`id`))) join `bookings` `b` on((`cs`.`booking_id` = `b`.`id`))) left join `subcategories` `sc` on((`b`.`subcategory_id` = `sc`.`id`))) where (`cs`.`session_status` = 'active') order by `cs`.`last_message_at` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_user_unread_counts`
--

/*!50001 DROP VIEW IF EXISTS `v_user_unread_counts`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_user_unread_counts` AS select `cp`.`user_id` AS `user_id`,`cp`.`user_type` AS `user_type`,count(`cm`.`id`) AS `unread_count`,max(`cm`.`created_at`) AS `last_unread_at` from ((`chat_participants` `cp` join `chat_sessions` `cs` on((`cp`.`session_id` = `cs`.`id`))) left join `chat_messages` `cm` on(((`cs`.`id` = `cm`.`session_id`) and (`cm`.`sender_id` <> `cp`.`user_id`) and (`cm`.`is_read` = 0)))) where (`cs`.`session_status` = 'active') group by `cp`.`user_id`,`cp`.`user_type` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-29 12:27:35
