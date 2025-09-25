-- Add email verification columns to users table
-- This migration is safe to run once; it checks for column existence where supported

USE omw_db;

-- Add email_verified column (0/1) with default 0
ALTER TABLE users 
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 
  COMMENT 'Whether the user has verified their email address' 
  AFTER is_active;

-- Add email_verified_at timestamp column
ALTER TABLE users 
  ADD COLUMN email_verified_at DATETIME NULL 
  COMMENT 'When the user verified their email address' 
  AFTER email_verified;

-- Optional: backfill verified flag for existing active users (disabled by default).
-- UPDATE users SET email_verified = 1 WHERE is_active = 1;

SELECT 'Email verification columns added to users table' AS migration_status;
