-- Add otp_expires_at column to bookings table for email-based OTP system
-- This migration adds expiration timestamp for OTP codes

USE omw_db;

-- Add otp_code column (6-digit) for email-based OTP system
ALTER TABLE bookings 
ADD COLUMN otp_code VARCHAR(6) NULL 
COMMENT '6-digit verification code sent via email'
AFTER service_status;

-- Add otp_expires_at column to bookings table (placed after otp_code)
ALTER TABLE bookings 
ADD COLUMN otp_expires_at DATETIME NULL 
COMMENT 'Expiration timestamp for OTP codes sent via email'
AFTER otp_code;

-- Create index for efficient OTP expiration queries
CREATE INDEX idx_bookings_otp_expires ON bookings(otp_expires_at);

-- Update any existing OTP codes to have a default expiration (15 minutes from now)
-- This is for any bookings that might have OTP codes without expiration
UPDATE bookings 
SET otp_expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE) 
WHERE otp_code IS NOT NULL AND otp_expires_at IS NULL;

-- Migration completed successfully
SELECT 'OTP expiration field added to bookings table' as migration_status;
