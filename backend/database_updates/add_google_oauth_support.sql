-- Add Google OAuth support to users table
-- This migration adds a google_id column to store Google's unique user identifier

-- Check if google_id column exists, if not add it
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL UNIQUE COMMENT 'Google OAuth unique identifier',
ADD INDEX IF NOT EXISTS idx_google_id (google_id);

-- Update comment for better documentation
ALTER TABLE users
MODIFY COLUMN google_id VARCHAR(255) NULL UNIQUE COMMENT 'Google OAuth unique identifier for social login';

-- Ensure email_verified column exists (should already exist from previous migrations)
ALTER TABLE users
MODIFY COLUMN email_verified TINYINT(1) DEFAULT 0 COMMENT 'Email verification status (0=not verified, 1=verified)';

-- Ensure email_verified_at column exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at DATETIME NULL COMMENT 'Timestamp when email was verified';

-- For users who login via Google, email is automatically verified
-- No data migration needed as this will be handled during OAuth login

SELECT 'Google OAuth support added successfully!' AS status;
