-- Cash Payment Tracking Table
CREATE TABLE IF NOT EXISTS `cash_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `worker_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `status` enum('pending','received','disputed') DEFAULT 'pending',
  `received_at` timestamp NULL DEFAULT NULL,
  `payment_method` enum('cash','card','other') DEFAULT 'cash',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_cash_payment` (`booking_id`),
  KEY `worker_id` (`worker_id`),
  KEY `status` (`status`),
  CONSTRAINT `cash_payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_payments_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Update bookings table to link with cash payments
ALTER TABLE `bookings` 
ADD COLUMN `cash_payment_id` int DEFAULT NULL AFTER `upi_payment_method_id`,
ADD KEY `cash_payment_id` (`cash_payment_id`),
ADD CONSTRAINT `bookings_ibfk_5` FOREIGN KEY (`cash_payment_id`) REFERENCES `cash_payments` (`id`) ON DELETE SET NULL;

-- Update payments table to support cash payments
ALTER TABLE `payments` 
ADD COLUMN `cash_payment_id` int DEFAULT NULL AFTER `upi_transaction_id`,
ADD KEY `cash_payment_id` (`cash_payment_id`),
ADD CONSTRAINT `payments_ibfk_4` FOREIGN KEY (`cash_payment_id`) REFERENCES `cash_payments` (`id`) ON DELETE SET NULL;
