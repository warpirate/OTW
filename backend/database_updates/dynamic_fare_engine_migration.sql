-- ============================================================================
-- Dynamic Fare Engine Migration
-- Creates tables for vehicle types, fare breakdowns, and pricing rules
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

-- ============================================================================
-- SEED DATA: Insert default vehicle types and pricing rules
-- ============================================================================

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

-- ============================================================================
-- INDEXES for performance optimization
-- ============================================================================

-- Additional indexes for fare calculations
CREATE INDEX `idx_fare_breakdown_quote_created` ON `ride_fare_breakdowns` (`quote_created_at`);
CREATE INDEX `idx_fare_breakdown_trip_dates` ON `ride_fare_breakdowns` (`trip_started_at`, `trip_ended_at`);
CREATE INDEX `idx_pricing_rules_category` ON `pricing_rules` (`category`, `is_active`);
CREATE INDEX `idx_vehicle_types_active` ON `pricing_vehicle_types` (`is_active`);

-- ============================================================================
-- VIEWS for easier data access
-- ============================================================================

-- View for active vehicle types with current pricing
CREATE OR REPLACE VIEW `v_active_vehicle_pricing` AS
SELECT 
    pvt.id,
    pvt.name,
    pvt.display_name,
    pvt.base_fare,
    pvt.rate_per_km,
    pvt.rate_per_min,
    pvt.minimum_fare,
    pvt.free_km_threshold,
    pvt.vehicle_multiplier,
    pvt.night_multiplier,
    pvt.max_surge_multiplier,
    pvt.surge_enabled
FROM pricing_vehicle_types pvt
WHERE pvt.is_active = 1
ORDER BY pvt.vehicle_multiplier ASC;

-- View for completed rides with fare breakdown
CREATE OR REPLACE VIEW `v_completed_rides_fare_summary` AS
SELECT 
    b.id as booking_id,
    b.user_id,
    b.provider_id,
    b.scheduled_time,
    b.service_status,
    b.payment_status,
    rfb.quote_id,
    pvt.display_name as vehicle_type,
    rfb.distance_km_est,
    rfb.distance_km_act,
    rfb.time_min_est,
    rfb.time_min_act,
    rfb.total_fare_est,
    rfb.final_fare,
    rfb.surge_multiplier_applied,
    rfb.night_hours_applied,
    rfb.promo_discount,
    rfb.tip_amount,
    rfb.trip_started_at,
    rfb.trip_ended_at
FROM bookings b
JOIN ride_fare_breakdowns rfb ON b.id = rfb.booking_id
JOIN pricing_vehicle_types pvt ON rfb.vehicle_type_id = pvt.id
WHERE b.booking_type = 'ride' 
  AND b.service_status IN ('completed', 'cancelled')
ORDER BY b.created_at DESC;

-- ============================================================================
-- TRIGGERS for data consistency
-- ============================================================================

-- Trigger to update booking estimated_cost when fare breakdown is created
DELIMITER $$
CREATE TRIGGER `tr_update_booking_estimated_cost` 
AFTER INSERT ON `ride_fare_breakdowns`
FOR EACH ROW
BEGIN
    UPDATE bookings 
    SET estimated_cost = NEW.total_fare_est 
    WHERE id = NEW.booking_id;
END$$
DELIMITER ;

-- Trigger to update booking actual_cost when trip is completed
DELIMITER $$
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

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
