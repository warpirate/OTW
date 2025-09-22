-- Create worker_location_history table for tracking worker locations
CREATE TABLE IF NOT EXISTS worker_location_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    booking_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2) NULL,
    heading DECIMAL(5, 2) NULL,
    speed DECIMAL(8, 2) NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_provider_booking (provider_id, booking_id),
    INDEX idx_created_at (created_at),
    INDEX idx_booking_status (booking_id, status),
    
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_location_time ON worker_location_history(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_location_time ON worker_location_history(booking_id, created_at DESC);

-- Add comments for documentation
ALTER TABLE worker_location_history 
COMMENT = 'Stores historical location data for workers during job tracking';

-- Add column comments
ALTER TABLE worker_location_history 
MODIFY COLUMN provider_id INT NOT NULL COMMENT 'Reference to providers table',
MODIFY COLUMN booking_id INT NOT NULL COMMENT 'Reference to bookings table',
MODIFY COLUMN latitude DECIMAL(10, 8) NOT NULL COMMENT 'Latitude coordinate',
MODIFY COLUMN longitude DECIMAL(11, 8) NOT NULL COMMENT 'Longitude coordinate',
MODIFY COLUMN accuracy DECIMAL(8, 2) NULL COMMENT 'Location accuracy in meters',
MODIFY COLUMN heading DECIMAL(5, 2) NULL COMMENT 'Direction of movement in degrees',
MODIFY COLUMN speed DECIMAL(8, 2) NULL COMMENT 'Speed in meters per second',
MODIFY COLUMN status VARCHAR(50) NOT NULL COMMENT 'Job status when location was recorded',
MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the location was recorded';


