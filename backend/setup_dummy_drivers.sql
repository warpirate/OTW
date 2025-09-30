-- ============================================================================
-- OMW CAB BOOKING - DUMMY DRIVER SETUP SCRIPT
-- ============================================================================
-- Purpose: Create verified drivers with vehicles for testing cab booking flow
-- Version: 1.0
-- Date: 2025-09-30
-- ============================================================================

-- STEP 1: Check Current State
-- ============================================================================

-- Check if driver availability columns exist
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'providers'
    AND COLUMN_NAME IN ('is_online', 'availability_status', 'last_seen', 'current_booking_id');

-- Check existing providers with driver services
SELECT 
    p.id,
    p.active,
    p.verified,
    u.name,
    u.email,
    u.role,
    COUNT(ps.id) as service_count,
    GROUP_CONCAT(s.name) as services
FROM providers p
JOIN users u ON p.user_id = u.id
LEFT JOIN provider_services ps ON p.id = ps.provider_id
LEFT JOIN subcategories s ON ps.subcategory_id = s.id
WHERE u.role = 'provider'
GROUP BY p.id;

-- Check ride/driver category
SELECT 
    sc.id as category_id,
    sc.name as category_name,
    sc.category_type,
    COUNT(s.id) as subcategory_count
FROM service_categories sc
LEFT JOIN subcategories s ON sc.id = s.category_id
WHERE sc.category_type = 'driver' OR sc.name LIKE '%ride%' OR sc.name LIKE '%driver%'
GROUP BY sc.id;

-- Check vehicle types
SELECT * FROM pricing_vehicle_types WHERE is_active = 1 ORDER BY vehicle_multiplier;

-- ============================================================================
-- STEP 2: Add Required Database Columns (if not exist)
-- ============================================================================

-- Add driver availability tracking columns
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS is_online TINYINT(1) DEFAULT 0 AFTER verified,
ADD COLUMN IF NOT EXISTS availability_status ENUM('available', 'busy', 'offline') DEFAULT 'offline' AFTER is_online,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP NULL AFTER availability_status,
ADD COLUMN IF NOT EXISTS current_booking_id INT NULL AFTER last_seen;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability ON providers(is_online, availability_status, last_seen);
CREATE INDEX IF NOT EXISTS idx_current_booking ON providers(current_booking_id);

-- Add trip tracking columns to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS trip_started_at TIMESTAMP NULL AFTER scheduled_time,
ADD COLUMN IF NOT EXISTS trip_completed_at TIMESTAMP NULL AFTER trip_started_at,
ADD COLUMN IF NOT EXISTS driver_eta_minutes INT NULL AFTER trip_completed_at,
ADD COLUMN IF NOT EXISTS trip_distance_actual DECIMAL(10, 2) NULL AFTER driver_eta_minutes;

-- Add payment integration fields
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100) NULL AFTER payment_status,
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100) NULL AFTER razorpay_order_id,
ADD COLUMN IF NOT EXISTS payment_method ENUM('upi', 'card', 'cash', 'wallet') DEFAULT 'cash' AFTER razorpay_payment_id;

-- Create driver location tracking table
CREATE TABLE IF NOT EXISTS driver_location_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    booking_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),
    speed DECIMAL(5, 2),
    heading DECIMAL(5, 2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_provider_booking (provider_id, booking_id),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 3: Ensure Driver/Ride Category Exists
-- ============================================================================

-- Get or create driver category
INSERT INTO service_categories (name, description, category_type, is_active, created_at)
SELECT 'Ride Services', 'On-demand cab and ride services', 'driver', 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM service_categories WHERE category_type = 'driver'
);

-- Set variable for driver category ID
SET @driver_category_id = (
    SELECT id FROM service_categories WHERE category_type = 'driver' LIMIT 1
);

-- Create driver subcategories if not exist
INSERT INTO subcategories (name, description, category_id, is_active, created_at)
SELECT 'Cab Ride', 'Standard cab ride service', @driver_category_id, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM subcategories WHERE name = 'Cab Ride' AND category_id = @driver_category_id
);

SET @cab_ride_subcategory_id = (
    SELECT id FROM subcategories WHERE name = 'Cab Ride' AND category_id = @driver_category_id LIMIT 1
);

-- ============================================================================
-- STEP 4: Ensure Vehicle Types Exist
-- ============================================================================

-- Insert vehicle types if not exist
INSERT INTO pricing_vehicle_types (
    name, display_name, base_fare, rate_per_km, rate_per_min, 
    minimum_fare, free_km_threshold, vehicle_multiplier, 
    night_multiplier, max_surge_multiplier, surge_enabled, is_active
)
SELECT 'economy', 'Go Economy', 50.00, 9.20, 1.00, 80.00, 2.00, 1.00, 1.25, 2.50, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM pricing_vehicle_types WHERE name = 'economy')
UNION ALL
SELECT 'sedan', 'Go Sedan', 70.00, 12.50, 1.50, 120.00, 2.00, 1.35, 1.30, 2.50, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM pricing_vehicle_types WHERE name = 'sedan')
UNION ALL
SELECT 'suv', 'Go SUV', 100.00, 15.00, 2.00, 180.00, 2.00, 1.75, 1.35, 2.50, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM pricing_vehicle_types WHERE name = 'suv')
UNION ALL
SELECT 'premium', 'Go Premium', 150.00, 20.00, 3.00, 250.00, 2.00, 2.25, 1.40, 2.50, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM pricing_vehicle_types WHERE name = 'premium');

-- ============================================================================
-- STEP 5: Create Dummy Driver Users
-- ============================================================================

-- Driver 1: Ravi Kumar (Economy - Hyderabad Hitech City area)
INSERT INTO users (name, email, phone, password, role, email_verified, phone_verified, created_at)
SELECT 'Ravi Kumar', 'ravi.driver@omw.com', '+919876543210', 
       '$2b$10$abcdefghijklmnopqrstuvwxyz123456', -- dummy hashed password
       'provider', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ravi.driver@omw.com');

SET @driver1_user_id = (SELECT id FROM users WHERE email = 'ravi.driver@omw.com' LIMIT 1);

INSERT INTO providers (user_id, active, verified, service_radius_km, location_lat, location_lng, rating, total_ratings, is_online, availability_status, last_seen)
SELECT @driver1_user_id, 1, 1, 10.0, 17.4435, 78.3772, 4.7, 342, 1, 'available', NOW()
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE user_id = @driver1_user_id);

SET @driver1_provider_id = (SELECT id FROM providers WHERE user_id = @driver1_user_id LIMIT 1);

-- Add vehicle for Driver 1
INSERT INTO vehicles (user_id, owner_name, vehicle_number, vehicle_model, vehicle_color, vehicle_type, seating_capacity, fuel_type, year_of_manufacture, status, created_at)
SELECT @driver1_user_id, 'Ravi Kumar', 'TS09EA1234', 'Honda City', 'White', 'Sedan', 4, 'Petrol', 2020, 'verified', NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicle_number = 'TS09EA1234');

SET @driver1_vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'TS09EA1234' LIMIT 1);

-- Add service to provider
INSERT INTO provider_services (provider_id, subcategory_id, is_active, created_at)
SELECT @driver1_provider_id, @cab_ride_subcategory_id, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_services 
    WHERE provider_id = @driver1_provider_id AND subcategory_id = @cab_ride_subcategory_id
);

-- Add permanent address
INSERT INTO provider_addresses (provider_id, address_type, street_address, city, state, zip_code, country, created_at)
SELECT @driver1_provider_id, 'permanent', 'Madhapur', 'Hyderabad', 'Telangana', '500081', 'India', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_addresses WHERE provider_id = @driver1_provider_id AND address_type = 'permanent'
);

-- ============================================================================
-- Driver 2: Suresh Reddy (Sedan - Gachibowli area)
INSERT INTO users (name, email, phone, password, role, email_verified, phone_verified, created_at)
SELECT 'Suresh Reddy', 'suresh.driver@omw.com', '+919876543211',
       '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
       'provider', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'suresh.driver@omw.com');

SET @driver2_user_id = (SELECT id FROM users WHERE email = 'suresh.driver@omw.com' LIMIT 1);

INSERT INTO providers (user_id, active, verified, service_radius_km, location_lat, location_lng, rating, total_ratings, is_online, availability_status, last_seen)
SELECT @driver2_user_id, 1, 1, 15.0, 17.4239, 78.3460, 4.5, 287, 1, 'available', NOW()
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE user_id = @driver2_user_id);

SET @driver2_provider_id = (SELECT id FROM providers WHERE user_id = @driver2_user_id LIMIT 1);

INSERT INTO vehicles (user_id, owner_name, vehicle_number, vehicle_model, vehicle_color, vehicle_type, seating_capacity, fuel_type, year_of_manufacture, status, created_at)
SELECT @driver2_user_id, 'Suresh Reddy', 'TS10XY5678', 'Maruti Dzire', 'Silver', 'Sedan', 4, 'Diesel', 2021, 'verified', NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicle_number = 'TS10XY5678');

INSERT INTO provider_services (provider_id, subcategory_id, is_active, created_at)
SELECT @driver2_provider_id, @cab_ride_subcategory_id, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_services 
    WHERE provider_id = @driver2_provider_id AND subcategory_id = @cab_ride_subcategory_id
);

INSERT INTO provider_addresses (provider_id, address_type, street_address, city, state, zip_code, country, created_at)
SELECT @driver2_provider_id, 'permanent', 'Gachibowli', 'Hyderabad', 'Telangana', '500032', 'India', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_addresses WHERE provider_id = @driver2_provider_id AND address_type = 'permanent'
);

-- ============================================================================
-- Driver 3: Vijay Singh (SUV - Kukatpally area)
INSERT INTO users (name, email, phone, password, role, email_verified, phone_verified, created_at)
SELECT 'Vijay Singh', 'vijay.driver@omw.com', '+919876543212',
       '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
       'provider', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vijay.driver@omw.com');

SET @driver3_user_id = (SELECT id FROM users WHERE email = 'vijay.driver@omw.com' LIMIT 1);

INSERT INTO providers (user_id, active, verified, service_radius_km, location_lat, location_lng, rating, total_ratings, is_online, availability_status, last_seen)
SELECT @driver3_user_id, 1, 1, 12.0, 17.4849, 78.3820, 4.8, 425, 1, 'available', NOW()
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE user_id = @driver3_user_id);

SET @driver3_provider_id = (SELECT id FROM providers WHERE user_id = @driver3_user_id LIMIT 1);

INSERT INTO vehicles (user_id, owner_name, vehicle_number, vehicle_model, vehicle_color, vehicle_type, seating_capacity, fuel_type, year_of_manufacture, status, created_at)
SELECT @driver3_user_id, 'Vijay Singh', 'TS07MN9012', 'Toyota Innova', 'Black', 'SUV', 7, 'Diesel', 2019, 'verified', NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicle_number = 'TS07MN9012');

INSERT INTO provider_services (provider_id, subcategory_id, is_active, created_at)
SELECT @driver3_provider_id, @cab_ride_subcategory_id, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_services 
    WHERE provider_id = @driver3_provider_id AND subcategory_id = @cab_ride_subcategory_id
);

INSERT INTO provider_addresses (provider_id, address_type, street_address, city, state, zip_code, country, created_at)
SELECT @driver3_provider_id, 'permanent', 'KPHB Colony', 'Hyderabad', 'Telangana', '500072', 'India', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_addresses WHERE provider_id = @driver3_provider_id AND address_type = 'permanent'
);

-- ============================================================================
-- Driver 4: Ramesh Gupta (Economy - Secunderabad area)
INSERT INTO users (name, email, phone, password, role, email_verified, phone_verified, created_at)
SELECT 'Ramesh Gupta', 'ramesh.driver@omw.com', '+919876543213',
       '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
       'provider', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ramesh.driver@omw.com');

SET @driver4_user_id = (SELECT id FROM users WHERE email = 'ramesh.driver@omw.com' LIMIT 1);

INSERT INTO providers (user_id, active, verified, service_radius_km, location_lat, location_lng, rating, total_ratings, is_online, availability_status, last_seen)
SELECT @driver4_user_id, 1, 1, 10.0, 17.4399, 78.4983, 4.6, 298, 1, 'available', NOW()
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE user_id = @driver4_user_id);

SET @driver4_provider_id = (SELECT id FROM providers WHERE user_id = @driver4_user_id LIMIT 1);

INSERT INTO vehicles (user_id, owner_name, vehicle_number, vehicle_model, vehicle_color, vehicle_type, seating_capacity, fuel_type, year_of_manufacture, status, created_at)
SELECT @driver4_user_id, 'Ramesh Gupta', 'TS06AB3456', 'Hyundai i20', 'Red', 'Hatchback', 4, 'Petrol', 2021, 'verified', NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicle_number = 'TS06AB3456');

INSERT INTO provider_services (provider_id, subcategory_id, is_active, created_at)
SELECT @driver4_provider_id, @cab_ride_subcategory_id, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_services 
    WHERE provider_id = @driver4_provider_id AND subcategory_id = @cab_ride_subcategory_id
);

INSERT INTO provider_addresses (provider_id, address_type, street_address, city, state, zip_code, country, created_at)
SELECT @driver4_provider_id, 'permanent', 'Ameerpet', 'Hyderabad', 'Telangana', '500016', 'India', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_addresses WHERE provider_id = @driver4_provider_id AND address_type = 'permanent'
);

-- ============================================================================
-- Driver 5: Anil Sharma (Premium - Banjara Hills area)
INSERT INTO users (name, email, phone, password, role, email_verified, phone_verified, created_at)
SELECT 'Anil Sharma', 'anil.driver@omw.com', '+919876543214',
       '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
       'provider', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'anil.driver@omw.com');

SET @driver5_user_id = (SELECT id FROM users WHERE email = 'anil.driver@omw.com' LIMIT 1);

INSERT INTO providers (user_id, active, verified, service_radius_km, location_lat, location_lng, rating, total_ratings, is_online, availability_status, last_seen)
SELECT @driver5_user_id, 1, 1, 20.0, 17.4126, 78.4479, 4.9, 512, 1, 'available', NOW()
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE user_id = @driver5_user_id);

SET @driver5_provider_id = (SELECT id FROM providers WHERE user_id = @driver5_user_id LIMIT 1);

INSERT INTO vehicles (user_id, owner_name, vehicle_number, vehicle_model, vehicle_color, vehicle_type, seating_capacity, fuel_type, year_of_manufacture, status, created_at)
SELECT @driver5_user_id, 'Anil Sharma', 'TS08PQ7890', 'BMW 3 Series', 'Blue', 'Sedan', 4, 'Petrol', 2022, 'verified', NOW()
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicle_number = 'TS08PQ7890');

INSERT INTO provider_services (provider_id, subcategory_id, is_active, created_at)
SELECT @driver5_provider_id, @cab_ride_subcategory_id, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_services 
    WHERE provider_id = @driver5_provider_id AND subcategory_id = @cab_ride_subcategory_id
);

INSERT INTO provider_addresses (provider_id, address_type, street_address, city, state, zip_code, country, created_at)
SELECT @driver5_provider_id, 'permanent', 'Banjara Hills', 'Hyderabad', 'Telangana', '500034', 'India', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM provider_addresses WHERE provider_id = @driver5_provider_id AND address_type = 'permanent'
);

-- ============================================================================
-- STEP 6: Verify All Documents (Mark as Verified)
-- ============================================================================

-- Update all driver verification statuses
UPDATE providers 
SET verified = 1, 
    active = 1,
    is_online = 1,
    availability_status = 'available',
    last_seen = NOW()
WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%.driver@omw.com'
);

-- Update all driver vehicles as verified
UPDATE vehicles 
SET status = 'verified'
WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%.driver@omw.com'
);

-- ============================================================================
-- STEP 7: Verification - Check Final State
-- ============================================================================

-- Summary of created drivers
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.phone,
    p.id as provider_id,
    p.active,
    p.verified,
    p.is_online,
    p.availability_status,
    p.location_lat,
    p.location_lng,
    p.service_radius_km,
    p.rating,
    v.vehicle_number,
    v.vehicle_model,
    v.vehicle_type,
    v.status as vehicle_status,
    COUNT(ps.id) as services_count
FROM users u
JOIN providers p ON u.id = p.user_id
LEFT JOIN vehicles v ON u.id = v.user_id
LEFT JOIN provider_services ps ON p.id = ps.provider_id
WHERE u.role = 'provider' AND u.email LIKE '%.driver@omw.com'
GROUP BY u.id, v.id;

-- Show driver locations on map (for visualization)
SELECT 
    u.name,
    p.location_lat as latitude,
    p.location_lng as longitude,
    p.service_radius_km,
    p.availability_status,
    v.vehicle_model,
    CONCAT('http://maps.google.com/maps?q=', p.location_lat, ',', p.location_lng) as map_link
FROM providers p
JOIN users u ON p.user_id = u.id
LEFT JOIN vehicles v ON u.id = v.user_id
WHERE u.email LIKE '%.driver@omw.com'
    AND p.is_online = 1;

-- ============================================================================
-- DONE! Dummy drivers created and ready for testing.
-- ============================================================================
-- Next steps:
-- 1. Review flow document: CAB_BOOKING_FLOW_COMPLETE.md
-- 2. Test driver search API: POST /customer/driver/search
-- 3. Test vehicle types API: GET /customer/ride/vehicle-types
-- 4. Start implementing fixes based on approved flow
-- ============================================================================
