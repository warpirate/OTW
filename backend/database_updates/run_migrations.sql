-- ============================================================================
-- OTW Database Migration Script
-- Execute these migrations in order after omw_4.0.sql is deployed
-- ============================================================================

-- Set safe mode and foreign key checks
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 1;

-- Switch to your database
USE omw_db;

-- ============================================================================
-- STEP 1: UPI Payment Support (payment_tables.sql)
-- Must run first as other scripts depend on upi_payment_method_id
-- ============================================================================

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

SELECT 'STEP 1 COMPLETED: UPI Payment Support Added' as migration_status;

-- ============================================================================
-- STEP 2: Cash Payment Tracking (cash_payment_tracking.sql)
-- Must run after Step 1 as it references upi_payment_method_id
-- ============================================================================

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

SELECT 'STEP 2 COMPLETED: Cash Payment Tracking Added' as migration_status;

-- ============================================================================
-- STEP 3: Dynamic Fare Engine (dynamic_fare_engine_migration.sql)
-- Independent subsystem for ride pricing and fare management
-- ============================================================================

-- Table 1: Vehicle Types with Pricing Configuration
CREATE TABLE IF NOT EXISTS `pricing_vehicle_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'e.g., Bike, Hatchback, Sedan, SUV',
  `display_name` varchar(100) NOT NULL COMMENT 'User-friendly name',
  `base_fare` decimal(8,2) NOT NULL DEFAULT 25.00 COMMENT 'Base fare in INR',
  `rate_per_km` decimal(8,2) NOT NULL DEFAULT 12.00 COMMENT 'Rate per kilometer in INR',
  `rate_per_min` decimal(8,2) NOT NULL DEFAULT 1.50 COMMENT 'Rate per minute in INR',
  `minimum_fare` decimal(8,2) NOT NULL DEFAULT 50.00 COMMENT 'Minimum fare guarantee',
  `free_km_threshold` decimal(5,2) NOT NULL DEFAULT 2.00 COMMENT 'Free kilometers included in base fare',
  `vehicle_multiplier` decimal(4,2) NOT NULL DEFAULT 1.00 COMMENT 'Vehicle type multiplier (bike=1.0, sedan=1.4, etc.)',
  `night_multiplier` decimal(4,2) NOT NULL DEFAULT 1.25 COMMENT 'Night time multiplier (11 PM - 6 AM)',
  `surge_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether surge pricing applies to this vehicle type',
  `max_surge_multiplier` decimal(4,2) NOT NULL DEFAULT 3.00 COMMENT 'Maximum allowed surge multiplier',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vehicle_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 2: Ride Fare Breakdowns (stores quote and actual fare details)
CREATE TABLE IF NOT EXISTS `ride_fare_breakdowns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `quote_id` varchar(50) NOT NULL COMMENT 'Unique identifier for the fare quote',
  `vehicle_type_id` int NOT NULL,
  
  -- Estimated values (from quote)
  `distance_km_est` decimal(8,2) DEFAULT NULL COMMENT 'Estimated distance in kilometers',
  `time_min_est` decimal(8,2) DEFAULT NULL COMMENT 'Estimated time in minutes',
  `base_fare_est` decimal(8,2) DEFAULT NULL,
  `distance_component_est` decimal(8,2) DEFAULT NULL,
  `time_component_est` decimal(8,2) DEFAULT NULL,
  `surge_component_est` decimal(8,2) DEFAULT NULL,
  `night_component_est` decimal(8,2) DEFAULT NULL,
  `total_fare_est` decimal(8,2) DEFAULT NULL,
  
  -- Actual values (after trip completion)
  `distance_km_act` decimal(8,2) DEFAULT NULL COMMENT 'Actual distance traveled',
  `time_min_act` decimal(8,2) DEFAULT NULL COMMENT 'Actual time taken',
  `base_fare_act` decimal(8,2) DEFAULT NULL,
  `distance_component_act` decimal(8,2) DEFAULT NULL,
  `time_component_act` decimal(8,2) DEFAULT NULL,
  `surge_component_act` decimal(8,2) DEFAULT NULL,
  `night_component_act` decimal(8,2) DEFAULT NULL,
  `total_fare_act` decimal(8,2) DEFAULT NULL,
  
  -- Additional charges and adjustments
  `promo_discount` decimal(8,2) DEFAULT 0.00,
  `tip_amount` decimal(8,2) DEFAULT 0.00,
  `cancellation_fee` decimal(8,2) DEFAULT 0.00,
  `waiting_charges` decimal(8,2) DEFAULT 0.00,
  `toll_charges` decimal(8,2) DEFAULT 0.00,
  `final_fare` decimal(8,2) DEFAULT NULL COMMENT 'Final amount charged to customer',
  
  -- Metadata
  `surge_multiplier_applied` decimal(4,2) DEFAULT 1.00,
  `night_hours_applied` tinyint(1) DEFAULT 0,
  `quote_created_at` timestamp NULL DEFAULT NULL,
  `trip_started_at` timestamp NULL DEFAULT NULL,
  `trip_ended_at` timestamp NULL DEFAULT NULL,
  `fare_calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_quote` (`booking_id`, `quote_id`),
  KEY `idx_quote_id` (`quote_id`),
  KEY `idx_vehicle_type` (`vehicle_type_id`),
  KEY `idx_booking_id` (`booking_id`),
  CONSTRAINT `fk_fare_breakdown_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fare_breakdown_vehicle_type` FOREIGN KEY (`vehicle_type_id`) REFERENCES `pricing_vehicle_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 3: Dynamic Pricing Rules (configurable parameters)
CREATE TABLE IF NOT EXISTS `pricing_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_key` varchar(100) NOT NULL COMMENT 'e.g., surge_demand_threshold, cancellation_fee_amount',
  `rule_value` text NOT NULL COMMENT 'JSON or simple value',
  `rule_type` enum('number','percentage','json','boolean','time') NOT NULL DEFAULT 'number',
  `description` text COMMENT 'Human-readable description of the rule',
  `category` varchar(50) DEFAULT 'general' COMMENT 'e.g., surge, cancellation, promo, night_charges',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rule_key` (`rule_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 4: Surge Pricing Zones (optional for location-based surge)
CREATE TABLE IF NOT EXISTS `surge_zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zone_name` varchar(100) NOT NULL,
  `zone_polygon` polygon NOT NULL COMMENT 'Geographic boundary of the zone',
  `current_surge_multiplier` decimal(4,2) NOT NULL DEFAULT 1.00,
  `demand_index` int NOT NULL DEFAULT 0 COMMENT 'Current demand level (0-100)',
  `active_drivers_count` int NOT NULL DEFAULT 0,
  `pending_requests_count` int NOT NULL DEFAULT 0,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  SPATIAL KEY `idx_zone_polygon` (`zone_polygon`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 5: Trip Location Tracking (for actual distance calculation)
CREATE TABLE IF NOT EXISTS `trip_location_logs` (
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
  KEY `idx_booking_provider` (`booking_id`, `provider_id`),
  KEY `idx_recorded_at` (`recorded_at`),
  CONSTRAINT `fk_trip_log_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trip_log_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default vehicle types
INSERT INTO `pricing_vehicle_types` (`name`, `display_name`, `base_fare`, `rate_per_km`, `rate_per_min`, `minimum_fare`, `free_km_threshold`, `vehicle_multiplier`, `night_multiplier`, `max_surge_multiplier`) VALUES
('bike', 'Bike', 20.00, 8.00, 1.00, 30.00, 2.00, 1.00, 1.20, 2.50),
('hatchback', 'Hatchback', 25.00, 12.00, 1.50, 50.00, 2.00, 1.20, 1.25, 3.00),
('sedan', 'Sedan', 35.00, 15.00, 2.00, 70.00, 2.50, 1.40, 1.30, 3.50),
('suv', 'SUV', 50.00, 20.00, 2.50, 100.00, 3.00, 1.80, 1.35, 4.00),
('van', 'Van/Tempo', 60.00, 18.00, 2.00, 120.00, 3.00, 1.60, 1.30, 3.00);

-- Insert default pricing rules
INSERT INTO `pricing_rules` (`rule_key`, `rule_value`, `rule_type`, `description`, `category`) VALUES
('surge_demand_threshold', '80', 'number', 'Demand percentage threshold to trigger surge pricing', 'surge'),
('surge_max_multiplier', '4.0', 'number', 'Maximum surge multiplier allowed', 'surge'),
('surge_calculation_interval_minutes', '5', 'number', 'How often to recalculate surge pricing', 'surge'),
('night_hours_start', '23:00', 'time', 'Night charges start time (24-hour format)', 'night_charges'),
('night_hours_end', '06:00', 'time', 'Night charges end time (24-hour format)', 'night_charges'),
('cancellation_fee_customer', '20.00', 'number', 'Cancellation fee charged to customer (INR)', 'cancellation'),
('cancellation_fee_driver', '10.00', 'number', 'Cancellation fee charged to driver (INR)', 'cancellation'),
('cancellation_grace_period_minutes', '5', 'number', 'Grace period before cancellation fee applies', 'cancellation'),
('waiting_charges_per_minute', '2.00', 'number', 'Waiting charges per minute after grace period', 'waiting'),
('waiting_grace_period_minutes', '3', 'number', 'Free waiting time before charges apply', 'waiting'),
('max_fare_deviation_percentage', '20', 'number', 'Maximum allowed deviation between estimated and actual fare', 'validation'),
('trip_timeout_multiplier', '2.0', 'number', 'Auto-end trip after ETA × this multiplier', 'timeout'),
('platform_commission_percentage', '20', 'percentage', 'Platform commission on completed rides', 'commission'),
('gst_percentage', '18', 'percentage', 'GST percentage on ride fares', 'tax'),
('free_cancellation_time_minutes', '5', 'number', 'Free cancellation window after booking', 'cancellation');

-- Performance indexes for fare calculations
CREATE INDEX `idx_fare_breakdown_quote_created` ON `ride_fare_breakdowns` (`quote_created_at`);
CREATE INDEX `idx_fare_breakdown_trip_dates` ON `ride_fare_breakdowns` (`trip_started_at`, `trip_ended_at`);
CREATE INDEX `idx_pricing_rules_category` ON `pricing_rules` (`category`, `is_active`);
CREATE INDEX `idx_vehicle_types_active` ON `pricing_vehicle_types` (`is_active`);

-- Triggers for data consistency
DELIMITER $$
CREATE TRIGGER `tr_update_booking_estimated_cost` 
AFTER INSERT ON `ride_fare_breakdowns`
FOR EACH ROW
BEGIN
    UPDATE bookings 
    SET estimated_cost = NEW.total_fare_est 
    WHERE id = NEW.booking_id;
END$$

CREATE TRIGGER `tr_update_booking_actual_cost` 
AFTER UPDATE ON `ride_fare_breakdowns`
FOR EACH ROW
BEGIN
    IF NEW.final_fare IS NOT NULL AND OLD.final_fare IS NULL THEN
        UPDATE bookings 
        SET actual_cost = NEW.final_fare 
        WHERE id = NEW.booking_id;
    END IF;
END$$
DELIMITER ;

SELECT 'STEP 3 COMPLETED: Dynamic Fare Engine Added' as migration_status;

-- ============================================================================
-- STEP 4: Payment Settlement & Wallet System (payment_settlement_tables.sql)
-- Advanced payment processing, wallet management, and provider earnings
-- ============================================================================

-- Table 1: User Wallets
CREATE TABLE IF NOT EXISTS `user_wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_wallet` (`user_id`, `currency`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 2: Wallet Transactions
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
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
  KEY `idx_user_transactions` (`user_id`, `created_at`),
  KEY `idx_booking_transactions` (`booking_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  CONSTRAINT `fk_wallet_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_transaction_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 3: Provider Earnings
CREATE TABLE IF NOT EXISTS `provider_earnings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `booking_id` int NOT NULL,
  `final_fare` decimal(10,2) NOT NULL,
  `platform_commission` decimal(10,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `provider_earnings` decimal(10,2) NOT NULL,
  `commission_percentage` decimal(5,2) NOT NULL,
  `gst_percentage` decimal(5,2) NOT NULL,
  `bonus_amount` decimal(10,2) DEFAULT 0.00,
  `penalty_amount` decimal(10,2) DEFAULT 0.00,
  `net_earnings` decimal(10,2) GENERATED ALWAYS AS (provider_earnings + bonus_amount - penalty_amount) STORED,
  `payout_status` enum('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
  `payout_date` date DEFAULT NULL,
  `payout_reference` varchar(100) DEFAULT NULL,
  `calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_provider_booking_earnings` (`provider_id`, `booking_id`),
  KEY `idx_provider_earnings` (`provider_id`, `calculated_at`),
  KEY `idx_payout_status` (`payout_status`),
  CONSTRAINT `fk_earnings_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_earnings_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 4: Payment Links (for additional charges)
CREATE TABLE IF NOT EXISTS `payment_links` (
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
  KEY `idx_user_payment_links` (`user_id`, `status`),
  CONSTRAINT `fk_payment_link_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_link_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 5: Payout Batches (for provider payouts)
CREATE TABLE IF NOT EXISTS `payout_batches` (
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
  KEY `idx_payout_status` (`status`, `created_at`),
  CONSTRAINT `fk_payout_batch_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 6: Payout Details (individual payouts within a batch)
CREATE TABLE IF NOT EXISTS `payout_details` (
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
  KEY `idx_provider_payouts` (`provider_id`, `status`),
  CONSTRAINT `fk_payout_detail_batch` FOREIGN KEY (`batch_id`) REFERENCES `payout_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payout_detail_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payout_detail_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `provider_banking_details` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table 7: Fare Dispute Records
CREATE TABLE IF NOT EXISTS `fare_disputes` (
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
  KEY `idx_dispute_status` (`status`, `created_at`),
  CONSTRAINT `fk_dispute_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dispute_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Performance indexes for wallet and earnings
CREATE INDEX `idx_wallet_transactions_date_range` ON `wallet_transactions` (`user_id`, `created_at`, `transaction_type`);
CREATE INDEX `idx_wallet_transactions_amount` ON `wallet_transactions` (`amount`, `transaction_type`);
CREATE INDEX `idx_provider_earnings_date_range` ON `provider_earnings` (`provider_id`, `calculated_at`, `payout_status`);
CREATE INDEX `idx_provider_earnings_amount` ON `provider_earnings` (`provider_earnings`, `payout_status`);
CREATE INDEX `idx_payment_links_status_expiry` ON `payment_links` (`status`, `expires_at`);

-- Triggers for data consistency
DELIMITER $$
CREATE TRIGGER `tr_update_earnings_payout_status` 
AFTER UPDATE ON `payout_details`
FOR EACH ROW
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE provider_earnings 
        SET payout_status = 'paid', payout_date = CURDATE(), payout_reference = NEW.external_reference
        WHERE provider_id = NEW.provider_id 
          AND calculated_at BETWEEN NEW.from_date AND NEW.to_date
          AND payout_status = 'pending';
    END IF;
END$$

CREATE TRIGGER `tr_validate_wallet_balance` 
BEFORE INSERT ON `wallet_transactions`
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(10,2);
    
    IF NEW.amount < 0 THEN
        SELECT balance INTO current_balance 
        FROM user_wallets 
        WHERE user_id = NEW.user_id;
        
        IF current_balance + NEW.amount < 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Insufficient wallet balance for this transaction';
        END IF;
    END IF;
END$$
DELIMITER ;

-- Stored procedures for common operations
DELIMITER $$
CREATE PROCEDURE `sp_calculate_provider_payout`(
    IN p_provider_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        p_provider_id as provider_id,
        COUNT(*) as total_rides,
        SUM(net_earnings) as total_earnings,
        MIN(calculated_at) as from_date,
        MAX(calculated_at) as to_date,
        AVG(net_earnings) as avg_earnings_per_ride
    FROM provider_earnings
    WHERE provider_id = p_provider_id
      AND DATE(calculated_at) BETWEEN p_from_date AND p_to_date
      AND payout_status = 'pending';
END$$

CREATE PROCEDURE `sp_get_wallet_transactions`(
    IN p_user_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT 
        wt.*,
        b.id as booking_reference
    FROM wallet_transactions wt
    LEFT JOIN bookings b ON wt.booking_id = b.id
    WHERE wt.user_id = p_user_id
    ORDER BY wt.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END$$
DELIMITER ;

SELECT 'STEP 4 COMPLETED: Payment Settlement & Wallet System Added' as migration_status;

-- ============================================================================
-- MIGRATION COMPLETED SUCCESSFULLY! 🎉
-- All 4 migration steps have been executed in the correct order.
-- ============================================================================

SELECT '✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY! 🎉' as final_status;
SELECT 'Your OTW database now has:' as summary;
SELECT '1. UPI Payment Support' as feature_1;
SELECT '2. Cash Payment Tracking' as feature_2;
SELECT '3. Dynamic Fare Engine with Surge Pricing' as feature_3;
SELECT '4. Advanced Wallet & Earnings System' as feature_4;
SELECT 'Database is now ready for production! 🚀' as conclusion;
