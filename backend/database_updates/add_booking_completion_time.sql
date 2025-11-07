-- Add completion_time column to bookings table
-- This tracks when a booking/job was actually completed (optional enhancement)

USE omw_db;

-- Add completion_time column to track when service was completed
ALTER TABLE bookings 
ADD COLUMN completion_time DATETIME NULL 
COMMENT 'Timestamp when the service/job was completed'
AFTER service_started_at;

-- Create index for better query performance
CREATE INDEX idx_completion_time ON bookings(completion_time);

-- Migration completed successfully
SELECT 'Added completion_time column to bookings table' as migration_status;

-- Note: This is optional. The system now uses updated_at to track completion.
-- Run this migration only if you want separate tracking of completion time.
