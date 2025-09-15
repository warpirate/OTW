-- UPI Payment Methods Table
CREATE TABLE IF NOT EXISTS `upi_payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `upi_id` varchar(100) NOT NULL,
  `provider_name` varchar(50) NOT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_upi` (`user_id`, `upi_id`),
  KEY `user_id` (`user_id`),
  KEY `is_default` (`is_default`),
  CONSTRAINT `upi_payment_methods_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- UPI Transactions Table
CREATE TABLE IF NOT EXISTS `upi_transactions` (
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
  `failure_reason` text DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Update existing payments table to support UPI
ALTER TABLE `payments` 
ADD COLUMN `upi_transaction_id` int DEFAULT NULL AFTER `razorpay_order_id`,
ADD COLUMN `payment_type` enum('razorpay','upi') DEFAULT 'razorpay' AFTER `method`,
ADD KEY `upi_transaction_id` (`upi_transaction_id`),
ADD CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`upi_transaction_id`) REFERENCES `upi_transactions` (`id`) ON DELETE SET NULL;

-- Update bookings table to support UPI payment method
ALTER TABLE `bookings` 
ADD COLUMN `upi_payment_method_id` int DEFAULT NULL AFTER `payment_status`,
ADD KEY `upi_payment_method_id` (`upi_payment_method_id`),
ADD CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`upi_payment_method_id`) REFERENCES `upi_payment_methods` (`id`) ON DELETE SET NULL;
