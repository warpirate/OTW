-- Update customer_verifications table to remove document_type column
-- The customer type is now determined through customers.customer_type_id -> customer_types relationship

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

-- 5. If customer_verifications table has document_type column, migrate the data first
-- Check if document_type column exists before trying to migrate
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'customer_verifications' 
    AND column_name = 'document_type'
);

-- Only run migration if document_type column exists
SET @sql = IF(@column_exists > 0, 
    'UPDATE customers c
     JOIN customer_verifications cv ON c.id = cv.customer_id
     SET c.customer_type_id = CASE 
       WHEN cv.document_type = ''student'' AND cv.verification_status IN (''pending'', ''verified'') THEN 3
       WHEN cv.document_type = ''senior_citizen'' AND cv.verification_status IN (''pending'', ''verified'') THEN 2
       ELSE 1
     END
     WHERE cv.document_type IN (''student'', ''senior_citizen'')',
    'SELECT "document_type column does not exist, skipping migration" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Remove document_type column from customer_verifications table
ALTER TABLE customer_verifications 
DROP COLUMN IF EXISTS document_type;

-- 7. Ensure customer_verifications table has the correct structure
-- (Remove any old ENUM constraints that might exist)
ALTER TABLE customer_verifications 
MODIFY COLUMN verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending';

-- 8. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_verifications_customer_status 
ON customer_verifications(customer_id, verification_status);

CREATE INDEX IF NOT EXISTS idx_customers_type 
ON customers(customer_type_id);

-- 9. Clean up any orphaned verification records (optional)
-- DELETE cv FROM customer_verifications cv
-- LEFT JOIN customers c ON c.id = cv.customer_id
-- WHERE c.id IS NULL;
