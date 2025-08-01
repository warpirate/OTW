-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: otw_db
-- ------------------------------------------------------
-- Server version	8.0.42

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_requests`
--

LOCK TABLES `booking_requests` WRITE;
/*!40000 ALTER TABLE `booking_requests` DISABLE KEYS */;
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
  `with_vehicle` tinyint(1) DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `pickup_address` varchar(255) DEFAULT NULL,
  `pickup_lat` decimal(10,8) DEFAULT NULL,
  `pickup_lon` decimal(11,8) DEFAULT NULL,
  `drop_address` varchar(255) DEFAULT NULL,
  `drop_lat` decimal(10,8) DEFAULT NULL,
  `drop_lon` decimal(11,8) DEFAULT NULL,
  `booking_type` enum('ride','service') NOT NULL DEFAULT 'service',
  `subcategory_id` int DEFAULT NULL,
  `scheduled_time` datetime DEFAULT NULL,
  `address` text,
  `gst` int DEFAULT NULL,
  `estimated_cost` int DEFAULT NULL,
  `actual_cost` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `service_status` varchar(20) DEFAULT NULL,
  `payment_status` varchar(20) DEFAULT 'unpaid',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `duration` int DEFAULT NULL,
  `cost_type` enum('per_hour','per_day') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `provider_id` (`provider_id`),
  KEY `subcategory_id` (`subcategory_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`),
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'service',29,'2025-08-05 08:00:00','2-5 Thimmaraopeta, Khammam, Telangana - 507168, India',360,NULL,NULL,2360,'cancelled','refunded','2025-07-31 04:37:18',NULL,NULL),(2,5,NULL,1,NULL,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580,'Khammam, Telangana, India',17.17291890,80.40575370,'ride',NULL,'2025-08-01 19:44:00',NULL,NULL,1500,NULL,NULL,'pending','pending','2025-08-01 13:09:19',3,'per_hour'),(3,5,NULL,1,NULL,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580,'Khammam, Telangana, India',17.17291890,80.40575370,'ride',NULL,'2025-08-02 09:33:00',NULL,NULL,2500,NULL,NULL,'pending','pending','2025-08-01 13:11:33',5,'per_hour'),(4,5,NULL,1,NULL,'Thimmaraopet, Enkoor mandal, Khammam, Telangana, India',17.37392240,80.36608580,'Khammam, Khammam Urban mandal, Khammam, Telangana, 507003, India',17.24653510,80.15003260,'ride',NULL,'2025-08-02 09:00:00',NULL,NULL,2500,NULL,NULL,'pending','pending','2025-08-01 13:22:08',5,'per_hour');
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_addresses`
--

LOCK TABLES `customer_addresses` WRITE;
/*!40000 ALTER TABLE `customer_addresses` DISABLE KEYS */;
INSERT INTO `customer_addresses` VALUES (1,5,'2-5 Thimmaraopeta','507168','Khammam','Telangana','India',0.00000000,0.00000000,_binary '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0','home','Home',1,1,'2025-07-31 04:36:54','2025-07-31 04:36:54');
/*!40000 ALTER TABLE `customer_addresses` ENABLE KEYS */;
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
  PRIMARY KEY (`id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (2,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,'2-5 Thimmaraopeta','507168','Khammam','Telangana','India',0.00000000,0.00000000);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
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
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
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
  `method` varchar(20) DEFAULT NULL,
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
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_addresses`
--

LOCK TABLES `provider_addresses` WRITE;
/*!40000 ALTER TABLE `provider_addresses` DISABLE KEYS */;
INSERT INTO `provider_addresses` VALUES (1,2,'permanent','Thimmaraopet, Enkoor mandal','Khammam','Telangana','507168','2025-08-01 04:04:00','2025-08-01 13:10:43');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_banking_details`
--

LOCK TABLES `provider_banking_details` WRITE;
/*!40000 ALTER TABLE `provider_banking_details` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_documents`
--

LOCK TABLES `provider_documents` WRITE;
/*!40000 ALTER TABLE `provider_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `provider_documents` ENABLE KEYS */;
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
  PRIMARY KEY (`id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `provider_qualifications_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_qualifications`
--

LOCK TABLES `provider_qualifications` WRITE;
/*!40000 ALTER TABLE `provider_qualifications` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provider_services`
--

LOCK TABLES `provider_services` WRITE;
/*!40000 ALTER TABLE `provider_services` DISABLE KEYS */;
INSERT INTO `provider_services` VALUES (3,1,21),(1,1,34),(2,2,67);
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
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `providers`
--

LOCK TABLES `providers` WRITE;
/*!40000 ALTER TABLE `providers` DISABLE KEYS */;
INSERT INTO `providers` VALUES (1,4,1,0.00,'Messi Koduku ni raa Saaleeeee',0,1,'2025-07-30 09:08:51',10,17.23170000,80.18260000,'2025-07-30 07:45:19','2025-07-30 09:08:51','messikoduku@gmail.com','6969696969','worker pilagadu','child','9876543210'),(2,7,2,0.00,'hi there, best bathroom cleaner here',0,1,'2025-08-01 13:10:49',10,17.24653510,80.15003260,'2025-08-01 04:04:00','2025-08-01 13:10:49','suhail.mscellpoint@gmail.com','09666339939','Suhail','friend','9666339939');
/*!40000 ALTER TABLE `providers` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_id` (`category_id`,`name`),
  CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategories`
--

LOCK TABLES `subcategories` WRITE;
/*!40000 ALTER TABLE `subcategories` DISABLE KEYS */;
INSERT INTO `subcategories` VALUES (21,'Airport Transfer',25,'Airport pickup and drop service',1500),(22,'City Tours',25,'Local city sightseeing tours',2000),(23,'Outstation Trips',25,'Long-distance travel service',5000),(24,'Wedding Transportation',25,'Wedding party transportation',4000),(25,'Corporate Travel',25,'Business travel services',3000),(26,'Emergency Transport',25,'24/7 emergency transport',2500),(27,'Hourly Rental',25,'Vehicle rental by the hour',1800),(28,'Kitchen Cabinets',17,'Custom kitchen cabinet installation and repair',5000),(29,'Furniture Repair',17,'Repair and restoration of wooden furniture',2000),(30,'Door Installation',17,'Door fitting and frame installation',3000),(31,'Window Frames',17,'Window frame repair and replacement',3500),(32,'Custom Shelving',17,'Custom built-in shelves and storage solutions',4000),(33,'Flooring Installation',17,'Wooden flooring installation and repair',6000),(34,'Deck Building',17,'Outdoor deck construction and maintenance',8000),(56,'Installation',18,'New AC unit installation',3000),(57,'Repair & Maintenance',18,'AC troubleshooting and regular maintenance',1500),(58,'Gas Refilling',18,'Refrigerant gas refilling service',2500),(59,'Cleaning & Servicing',18,'Deep cleaning and servicing of AC units',1200),(60,'Duct Cleaning',18,'AC duct cleaning and maintenance',2000),(61,'Thermostat Installation',18,'Smart thermostat installation and setup',1800),(62,'Pipe Repair',19,'Leaky pipe repair and replacement',1000),(63,'Drain Cleaning',19,'Clogged drain cleaning and unblocking',800),(64,'Toilet Installation',19,'Toilet fitting and installation',2500),(65,'Faucet Repair',19,'Faucet repair and replacement',500),(66,'Water Heater Service',19,'Water heater installation and repair',3500),(67,'Bathroom Renovation',19,'Complete bathroom plumbing renovation',10000),(68,'Emergency Plumbing',19,'24/7 emergency plumbing services',2000),(69,'Wiring Installation',20,'Complete house wiring installation',5000),(70,'Light Fixture Setup',20,'Light fixture installation and repair',800),(71,'Outlet Installation',20,'Electrical outlet and switch installation',600),(72,'Circuit Breaker Repair',20,'Circuit breaker troubleshooting and repair',1500),(73,'Fan Installation',20,'Ceiling and exhaust fan installation',1000),(74,'Electrical Inspection',20,'Complete electrical safety inspection',2000),(75,'Emergency Electrical',20,'24/7 emergency electrical services',2500),(76,'Termite Treatment',21,'Termite inspection and treatment',3000),(77,'Rodent Control',21,'Rat and mouse extermination',2500),(78,'Cockroach Treatment',21,'Cockroach elimination service',2000),(79,'Ant Control',21,'Ant colony removal and prevention',1800),(80,'Bed Bug Treatment',21,'Bed bug extermination service',3500),(81,'Mosquito Control',21,'Mosquito fogging and prevention',2200),(82,'General Fumigation',21,'Complete home fumigation service',4000),(83,'House Cleaning',22,'Standard home cleaning service',1500),(84,'Deep Cleaning',22,'Thorough deep cleaning service',3000),(85,'Carpet Cleaning',22,'Professional carpet cleaning and nice work',2000),(86,'Window Cleaning',22,'Interior/exterior window cleaning',1200),(87,'Post-Construction Cleanup',22,'Post-construction debris removal',3500),(88,'Office Cleaning',22,'Commercial office cleaning',2500),(89,'Move-in/Move-out Cleaning',22,'Complete home cleaning for moving',4000),(90,'Daily Meal Prep',23,'Daily home-cooked meal preparation',5000),(91,'Party Catering',23,'Event and party catering service',8000),(92,'Special Occasion Cooking',23,'Custom meals for special events',6000),(93,'Meal Planning',23,'Personalized meal planning service',3000),(94,'Cooking Classes',23,'In-home cooking lessons',2000),(95,'Diet-specific Meals',23,'Special diet meal preparation',5500),(96,'Bulk Cooking',23,'Large quantity meal preparation',7000),(97,'Moving Assistance',24,'Help with moving and packing',2500),(98,'Furniture Assembly',24,'Furniture assembly and setup',1500),(99,'Yard Work',24,'Gardening and yard maintenance',2000),(100,'Painting',24,'Interior/exterior painting service',4000),(101,'Minor Repairs',24,'Various home repair services',1800),(102,'Organizing Services',24,'Home organization and decluttering',3000),(103,'Handyman Tasks',24,'Various handyman services',2200);
/*!40000 ALTER TABLE `subcategories` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (2,2,4),(3,3,3),(4,4,2),(5,5,1),(6,6,3),(7,7,2);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `phone_number` varchar(10) DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'super admin','superadmin@otw.com','$2b$10$Y/hsbzGdXiC27mLi3mjE1.R02KZ8zy1SFhsgDFJsr.ODD/zmujxZS',1,'2025-07-30 07:41:08',NULL,'prefer_not_to_say'),(3,'admin','admin@otw.com','$2b$10$YNBUMXyo2RWvlUE3qeA93eu/JGPpko0cBGZIL9B7dZ0RLztKuZNNa',1,'2025-07-30 07:43:57','7894561230','female'),(4,'Messi Gadi  Worker','messikoduku@otw.com','$2b$10$wgK1UNdeDiChC98GTFEu6.kPuldUPzoEw0N3LR/HHbPl6.d90cUii',1,'2025-07-30 07:45:19','7894561230',NULL),(5,'suhail mahamad','suhail@gmail.com','$2b$10$NMHFools5i5H51nnaYtpiuxEOgv5p/jroe1KP6NqH8fFQrBYjOewy',1,'2025-07-30 10:19:11','9666339939','male'),(6,'admin with gender','adminwithgender@otw.com','$2b$10$NgCjRzbG/fVugJmmfkKD4Obxet967ce6151uAn1x4AiO5Mx7rCTVa',1,'2025-07-31 09:17:08','1234567890','male'),(7,'worker test','worker@otw.com','$2b$10$NKLoK3bz4E3haEWN3f7Z5.DRXva/vomRnXtmJ3CCRn4uAc./YicM.',1,'2025-08-01 04:04:00',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-01 19:02:06
