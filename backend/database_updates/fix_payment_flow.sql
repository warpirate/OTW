-- Fix Payment Flow Issues
-- This migration adds missing fields and fixes payment status inconsistencies

-- 1. Add total_amount field to bookings table
-- This field is required by payment routes to get the booking amount
ALTER TABLE `bookings`
ADD COLUMN `total_amount` DECIMAL(10,2) DEFAULT NULL AFTER `price`,
ADD COLUMN `payment_method` VARCHAR(50) DEFAULT NULL AFTER `payment_status`,
ADD COLUMN `payment_completed_at` TIMESTAMP NULL DEFAULT NULL AFTER `payment_method`;

-- 2. Populate total_amount with existing price data
-- For existing bookings, use price or estimated_cost as total_amount
UPDATE `bookings`
SET `total_amount` = COALESCE(`price`, `estimated_cost`, 0)
WHERE `total_amount` IS NULL;

-- 3. Update payment_status values to be consistent
-- Change 'unpaid' to 'pending' for consistency with payment routes
UPDATE `bookings`
SET `payment_status` = 'pending'
WHERE `payment_status` = 'unpaid';

-- 4. Add index for faster payment queries
ALTER TABLE `bookings`
ADD INDEX `idx_payment_status` (`payment_status`),
ADD INDEX `idx_payment_completed` (`payment_completed_at`);

-- 5. Update bookings where payment was completed but status not updated
-- This syncs bookings table with payments table
UPDATE `bookings` b
INNER JOIN `payments` p ON b.id = p.booking_id
SET b.payment_status = 'paid',
    b.payment_method = CASE
        WHEN p.payment_type = 'razorpay' THEN 'Razorpay'
        WHEN p.payment_type = 'upi' THEN 'UPI Payment'
        ELSE 'Online Payment'
    END,
    b.payment_completed_at = p.captured_at
WHERE p.status = 'captured'
  AND b.payment_status != 'paid';
