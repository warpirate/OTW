-- Payment API Keys Management Schema
-- This table stores encrypted payment gateway credentials and API keys

CREATE TABLE IF NOT EXISTS payment_api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier for the key (e.g., RAZORPAY_KEY_ID)',
  key_value TEXT NOT NULL COMMENT 'Encrypted value of the key',
  key_type ENUM('razorpay', 'google_maps', 'aws', 'jwt', 'email') NOT NULL COMMENT 'Category of the API key',
  is_sensitive BOOLEAN DEFAULT TRUE COMMENT 'Whether this key should be masked in UI',
  description TEXT COMMENT 'Description of what this key is used for',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this key is currently active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT COMMENT 'ID of the admin who last updated this key',
  INDEX idx_key_type (key_type),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default encrypted values (these will be encrypted by the backend)
-- Note: Run the migration script after this to encrypt existing .env values

-- Audit log for payment key changes
CREATE TABLE IF NOT EXISTS payment_key_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_id INT NOT NULL,
  key_name VARCHAR(100) NOT NULL,
  action ENUM('created', 'updated', 'deleted', 'viewed') NOT NULL,
  old_value_hash VARCHAR(64) COMMENT 'SHA256 hash of old value for verification',
  new_value_hash VARCHAR(64) COMMENT 'SHA256 hash of new value for verification',
  changed_by INT NOT NULL,
  changed_by_email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_key_id (key_id),
  INDEX idx_changed_by (changed_by),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (key_id) REFERENCES payment_api_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a master encryption key table (stores the encryption key ID, not the key itself)
-- The actual encryption key should be stored in environment variable MASTER_ENCRYPTION_KEY
CREATE TABLE IF NOT EXISTS encryption_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_version VARCHAR(50) NOT NULL UNIQUE COMMENT 'Version identifier for the encryption key',
  algorithm VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm' COMMENT 'Encryption algorithm used',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP NULL COMMENT 'When this key version was rotated',
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default encryption metadata
INSERT INTO encryption_metadata (key_version, algorithm, is_active) 
VALUES ('v1', 'aes-256-gcm', TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;
