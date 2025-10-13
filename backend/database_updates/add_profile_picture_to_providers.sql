-- Migration: Add profile_picture_url to providers table
-- Description: Adds profile picture URL field to store worker profile images in S3
-- Date: 2025-01-13

-- Add profile_picture_url column to providers table
ALTER TABLE providers 
ADD COLUMN profile_picture_url VARCHAR(500) DEFAULT NULL AFTER bio,
ADD INDEX idx_profile_picture (profile_picture_url(255));

-- Add comment for documentation
ALTER TABLE providers 
MODIFY COLUMN profile_picture_url VARCHAR(500) DEFAULT NULL 
COMMENT 'S3 URL for worker profile picture';
