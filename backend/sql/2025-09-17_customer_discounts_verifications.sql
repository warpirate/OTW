-- Customer Types and Verifications schema
-- Run this against your MySQL database (otw_db)

-- 1) Table: customer_types
CREATE TABLE IF NOT EXISTS customer_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Seed initial customer types FIRST to ensure id=1 exists before adding FK
INSERT INTO customer_types (id, name, discount_percentage)
VALUES 
  (1, 'Normal', 0.00),
  (2, 'Senior Citizen', 10.00),
  (3, 'Student', 15.00)
ON DUPLICATE KEY UPDATE discount_percentage = VALUES(discount_percentage), name = VALUES(name);

-- 3) Add customer_type_id column if it doesn't exist (some MySQL versions don't support IF NOT EXISTS on columns)
-- Safe approach: check by attempting to add and ignore duplicate column error manually if needed.
ALTER TABLE customers ADD COLUMN customer_type_id INT DEFAULT 1;

-- 4) Backfill existing rows to Normal (1)
UPDATE customers SET customer_type_id = 1 WHERE customer_type_id IS NULL;

-- 5) Add foreign key after data is consistent
ALTER TABLE customers 
  ADD CONSTRAINT fk_customers_customer_type
    FOREIGN KEY (customer_type_id) REFERENCES customer_types(id);

-- 6) Table: customer_verifications (independent)
CREATE TABLE IF NOT EXISTS customer_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  document_url VARCHAR(255) NOT NULL,
  document_type ENUM('student_id', 'aadhaar', 'pan', 'other') NOT NULL,
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_verifications_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
