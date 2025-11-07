-- Job Completion Selfie Verification Schema
-- This migration adds support for selfie verification after job completion

-- Create job_completion_selfies table
CREATE TABLE IF NOT EXISTS job_completion_selfies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    worker_id INT NOT NULL,
    selfie_s3_url VARCHAR(500) NOT NULL,
    profile_picture_s3_url VARCHAR(500) NOT NULL,
    
    -- Location verification
    selfie_latitude DECIMAL(10, 8) NOT NULL,
    selfie_longitude DECIMAL(11, 8) NOT NULL,
    customer_latitude DECIMAL(10, 8) NOT NULL,
    customer_longitude DECIMAL(11, 8) NOT NULL,
    distance_meters DECIMAL(8, 2) NOT NULL,
    location_verified BOOLEAN DEFAULT FALSE,
    
    -- Face comparison results
    face_match_confidence DECIMAL(5, 2) DEFAULT NULL,
    face_comparison_successful BOOLEAN DEFAULT FALSE,
    rekognition_response JSON DEFAULT NULL,
    
    -- Verification status
    verification_status ENUM('pending', 'verified', 'failed', 'rejected') DEFAULT 'pending',
    verification_notes TEXT DEFAULT NULL,
    
    -- Timestamps
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_booking_id (booking_id),
    INDEX idx_worker_id (worker_id),
    INDEX idx_verification_status (verification_status),
    INDEX idx_captured_at (captured_at),
    
    -- Unique constraint - one selfie per booking
    UNIQUE KEY unique_booking_selfie (booking_id)
);

-- Add selfie verification status to bookings table
ALTER TABLE bookings 
ADD COLUMN selfie_verification_required BOOLEAN DEFAULT TRUE,
ADD COLUMN selfie_verification_status ENUM('not_required', 'pending', 'verified', 'failed') DEFAULT 'not_required',
ADD COLUMN selfie_verified_at TIMESTAMP NULL,
ADD INDEX idx_selfie_verification_status (selfie_verification_status);

-- Update existing completed bookings to not require selfie verification
UPDATE bookings 
SET selfie_verification_required = FALSE, 
    selfie_verification_status = 'not_required' 
WHERE service_status = 'completed';

-- Create audit log for selfie verification actions
CREATE TABLE IF NOT EXISTS selfie_verification_audit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    worker_id INT NOT NULL,
    action ENUM('selfie_uploaded', 'location_verified', 'face_verified', 'verification_completed', 'verification_failed', 'admin_review') NOT NULL,
    details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES providers(id) ON DELETE CASCADE,
    
    INDEX idx_booking_id (booking_id),
    INDEX idx_worker_id (worker_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Insert sample configuration for selfie verification
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description, is_sensitive, updated_by) VALUES
('SELFIE_VERIFICATION_ENABLED', 'true', 'boolean', 'verification', 'Enable selfie verification for job completion', FALSE, 'system'),
('SELFIE_MAX_DISTANCE_METERS', '400', 'number', 'verification', 'Maximum allowed distance from customer location for selfie (meters)', FALSE, 'system'),
('SELFIE_FACE_MATCH_THRESHOLD', '80.0', 'number', 'verification', 'Minimum confidence score for face matching (percentage)', FALSE, 'system'),
('SELFIE_S3_BUCKET', 'worker-verification-images', 'string', 'aws', 'S3 bucket for storing job completion selfies', FALSE, 'system'),
('SELFIE_VERIFICATION_TIMEOUT_HOURS', '24', 'number', 'verification', 'Hours after job completion to allow selfie upload', FALSE, 'system');
