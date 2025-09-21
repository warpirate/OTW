-- Fix bookings table - Add missing columns
-- This migration adds the missing columns that the API expects

-- Add missing columns to bookings table
-- Check if columns exist before adding them
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'bookings' 
     AND COLUMN_NAME = 'address') = 0,
    'ALTER TABLE bookings ADD COLUMN address TEXT',
    'SELECT "Column address already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'bookings' 
     AND COLUMN_NAME = 'notes') = 0,
    'ALTER TABLE bookings ADD COLUMN notes TEXT',
    'SELECT "Column notes already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'bookings' 
     AND COLUMN_NAME = 'otp_code') = 0,
    'ALTER TABLE bookings ADD COLUMN otp_code VARCHAR(10)',
    'SELECT "Column otp_code already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'bookings' 
     AND COLUMN_NAME = 'updated_at') = 0,
    'ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'SELECT "Column updated_at already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'bookings' 
     AND COLUMN_NAME = 'customer_id') = 0,
    'ALTER TABLE bookings ADD COLUMN customer_id INT',
    'SELECT "Column customer_id already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for customer_id if it doesn't exist
-- (This assumes customer_id should reference the same table as user_id)
-- ALTER TABLE bookings ADD CONSTRAINT fk_bookings_customer_id FOREIGN KEY (customer_id) REFERENCES users(id);

-- Update existing records to set customer_id = user_id for consistency
UPDATE bookings SET customer_id = user_id WHERE customer_id IS NULL;

-- Add index for better performance (only if they don't exist)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'bookings' 
     AND INDEX_NAME = 'idx_bookings_customer_id') = 0,
    'CREATE INDEX idx_bookings_customer_id ON bookings(customer_id)',
    'SELECT "Index idx_bookings_customer_id already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'bookings' 
     AND INDEX_NAME = 'idx_bookings_updated_at') = 0,
    'CREATE INDEX idx_bookings_updated_at ON bookings(updated_at)',
    'SELECT "Index idx_bookings_updated_at already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the changes
SELECT 'Bookings table updated successfully' as status;
