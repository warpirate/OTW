-- Update provider_qualifications table to support certificate uploads and admin approval
-- Migration: Add certificate_url, status, remarks, and timestamps

-- Add new columns to provider_qualifications table
ALTER TABLE provider_qualifications 
ADD COLUMN certificate_url VARCHAR(255) NULL COMMENT 'S3 object key or local file path for certificate document',
ADD COLUMN status ENUM('pending_review', 'approved', 'rejected') DEFAULT 'pending_review' COMMENT 'Admin approval status',
ADD COLUMN remarks TEXT NULL COMMENT 'Admin remarks for approval/rejection',
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add index for better query performance
CREATE INDEX idx_provider_qualifications_status ON provider_qualifications(status);
CREATE INDEX idx_provider_qualifications_provider_status ON provider_qualifications(provider_id, status);

-- Update existing records to have pending_review status
UPDATE provider_qualifications SET status = 'pending_review' WHERE status IS NULL;
