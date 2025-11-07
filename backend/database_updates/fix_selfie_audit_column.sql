-- Fix selfie_verification_audit action column size
-- Error: Data truncated for column 'action' at row 1
-- The action column needs to support longer action names like 'location_verification_failed' (29 chars)

USE omw_db;

-- Modify action column to support longer action names
ALTER TABLE selfie_verification_audit 
MODIFY COLUMN action VARCHAR(50) NOT NULL 
COMMENT 'Action performed (e.g., selfie_uploaded, location_verification_failed)';

-- Add index for better query performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_action ON selfie_verification_audit(action);

-- Migration completed successfully
SELECT 'Selfie verification audit table action column updated to VARCHAR(50)' as migration_status;
