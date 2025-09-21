-- Add rating columns to bookings table
-- This migration adds rating, review, and rating_submitted_at columns to the bookings table

-- Add rating column (1-5 stars)
ALTER TABLE bookings ADD COLUMN rating DECIMAL(2,1) DEFAULT NULL;

-- Add review column (optional text review)
ALTER TABLE bookings ADD COLUMN review TEXT DEFAULT NULL;

-- Add rating submission timestamp
ALTER TABLE bookings ADD COLUMN rating_submitted_at TIMESTAMP NULL DEFAULT NULL;

-- Add check constraint for rating (1-5)
ALTER TABLE bookings ADD CONSTRAINT chk_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Add index for rating queries
CREATE INDEX idx_bookings_rating ON bookings(rating);
CREATE INDEX idx_bookings_rating_submitted ON bookings(rating_submitted_at);

-- Add rating columns to providers table if they don't exist
-- Check if rating column exists in providers table
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'providers' 
     AND COLUMN_NAME = 'rating') = 0,
    'ALTER TABLE providers ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00',
    'SELECT "rating column already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if total_ratings column exists in providers table
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'providers' 
     AND COLUMN_NAME = 'total_ratings') = 0,
    'ALTER TABLE providers ADD COLUMN total_ratings INT DEFAULT 0',
    'SELECT "total_ratings column already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for provider rating queries (with error handling)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'providers' 
     AND INDEX_NAME = 'idx_providers_rating') = 0,
    'CREATE INDEX idx_providers_rating ON providers(rating)',
    'SELECT "idx_providers_rating index already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'providers' 
     AND INDEX_NAME = 'idx_providers_total_ratings') = 0,
    'CREATE INDEX idx_providers_total_ratings ON providers(total_ratings)',
    'SELECT "idx_providers_total_ratings index already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
