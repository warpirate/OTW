-- Update customer_verifications table to support only Student and Senior Citizen types
-- Run this migration to update existing data and schema

-- 1. Ensure customer_types table has the correct data
INSERT INTO customer_types (id, name, discount_percentage)
VALUES 
  (1, 'Normal', 0.00),
  (2, 'Senior Citizen', 10.00),
  (3, 'Student', 15.00)
ON DUPLICATE KEY UPDATE 
  discount_percentage = VALUES(discount_percentage), 
  name = VALUES(name);

-- 2. Ensure customers table has customer_type_id column and default values
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_type_id INT DEFAULT 1;

-- 3. Update existing customers to have Normal type if NULL
UPDATE customers 
SET customer_type_id = 1 
WHERE customer_type_id IS NULL;

-- 4. Add foreign key constraint if it doesn't exist
ALTER TABLE customers 
ADD CONSTRAINT IF NOT EXISTS fk_customers_customer_type
  FOREIGN KEY (customer_type_id) REFERENCES customer_types(id);

-- 5. Update the ENUM to support new values
ALTER TABLE customer_verifications 
MODIFY COLUMN document_type ENUM('student', 'senior_citizen', 'student_id', 'aadhaar', 'pan', 'other') NOT NULL;

-- 6. Update existing data to map to new types
UPDATE customer_verifications 
SET document_type = 'student' 
WHERE document_type = 'student_id';

-- 7. Set other document types to rejected status (since we only support student and senior_citizen now)
UPDATE customer_verifications 
SET verification_status = 'rejected' 
WHERE document_type IN ('aadhaar', 'pan', 'other');

-- 8. Update customer types for existing verified documents
UPDATE customers c
JOIN customer_verifications cv ON c.id = cv.customer_id
SET c.customer_type_id = CASE 
  WHEN cv.document_type = 'student' AND cv.verification_status = 'verified' THEN 3
  WHEN cv.document_type = 'senior_citizen' AND cv.verification_status = 'verified' THEN 2
  ELSE 1
END
WHERE cv.verification_status = 'verified';

-- 9. Finally, remove old enum values and keep only the new ones
ALTER TABLE customer_verifications 
MODIFY COLUMN document_type ENUM('student', 'senior_citizen') NOT NULL;

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_verifications_customer_status 
ON customer_verifications(customer_id, verification_status);

CREATE INDEX IF NOT EXISTS idx_customers_type 
ON customers(customer_type_id);
