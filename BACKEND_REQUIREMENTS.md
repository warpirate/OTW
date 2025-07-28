# Backend Requirements for Worker Management Updates

## Overview
Based on the new requirements for worker registration, the following changes need to be implemented in the backend to support the enhanced worker management system.

## Database Schema Changes

### 1. Update `users` table
Add the following columns to support new mandatory fields:

```sql
ALTER TABLE users ADD COLUMN emergency_contact_name VARCHAR(255);
ALTER TABLE users ADD COLUMN emergency_contact_relationship ENUM('parent', 'spouse', 'sibling', 'child', 'friend', 'relative', 'other');
ALTER TABLE users ADD COLUMN emergency_contact_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN bank_name VARCHAR(255);
ALTER TABLE users ADD COLUMN account_number VARCHAR(50);
ALTER TABLE users ADD COLUMN ifsc_code VARCHAR(11);
ALTER TABLE users ADD COLUMN account_holder_name VARCHAR(255);

-- Make both email and phone mandatory for workers
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL;
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;
```

### 2. Alternative Approach: Create separate tables (Recommended)

For better data organization and security, consider creating separate tables:

```sql
-- Emergency contacts table
CREATE TABLE emergency_contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    relationship ENUM('parent', 'spouse', 'sibling', 'child', 'friend', 'relative', 'other') NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Banking details table (with encryption)
CREATE TABLE banking_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number_encrypted TEXT NOT NULL,  -- Store encrypted
    ifsc_code VARCHAR(11) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Updates

### 1. Worker Registration Endpoint
Update `/api/worker/register` to handle new fields:

**Request Body Changes:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string", // Now mandatory
  "phone": "string", // Now mandatory
  "password": "string",
  "role": "worker",
  "signupMethod": "both", // Changed from 'email' or 'phone'
  
  // New Emergency Contact Fields
  "emergencyContactName": "string",
  "emergencyContactRelationship": "string",
  "emergencyContactPhone": "string",
  
  // New Banking Details Fields
  "bankName": "string",
  "accountNumber": "string",
  "ifscCode": "string",
  "accountHolderName": "string",
  
  "providerData": {
    // ... existing provider fields
  }
}
```

### 2. Validation Updates
Add server-side validation for:

```javascript
// Emergency Contact Validation
const emergencyContactValidation = {
  emergencyContactName: { required: true, minLength: 2, maxLength: 255 },
  emergencyContactRelationship: { 
    required: true, 
    enum: ['parent', 'spouse', 'sibling', 'child', 'friend', 'relative', 'other'] 
  },
  emergencyContactPhone: { required: true, pattern: /^[0-9]{10}$/ }
};

// Banking Details Validation
const bankingDetailsValidation = {
  bankName: { required: true, minLength: 2, maxLength: 255 },
  accountNumber: { required: true, minLength: 9, maxLength: 18 },
  ifscCode: { required: true, pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
  accountHolderName: { required: true, minLength: 2, maxLength: 255 }
};

// Updated User Validation
const userValidation = {
  email: { required: true, type: 'email' }, // Now mandatory
  phone: { required: true, pattern: /^[0-9]{10}$/ } // Now mandatory
};
```

### 3. Security Enhancements
Implement encryption for sensitive banking data:

```javascript
const crypto = require('crypto');

// Encryption helper functions
const encrypt = (text) => {
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY; // 32-byte key
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
};

const decrypt = (encryptedObj) => {
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY;
  const decipher = crypto.createDecipher(algorithm, key, Buffer.from(encryptedObj.iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

## Updated Registration Flow

### 1. Worker Registration Handler
```javascript
router.post('/worker/register', async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    password, 
    emergencyContactName,
    emergencyContactRelationship,
    emergencyContactPhone,
    bankName,
    accountNumber,
    ifscCode,
    accountHolderName,
    providerData 
  } = req.body;
  
  // Validate all required fields including new ones
  const validationErrors = validateWorkerRegistration(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: validationErrors
    });
  }
  
  try {
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // 1. Create user account
      const hashedPassword = await bcrypt.hash(password, 10);
      const userResult = await connection.execute(
        'INSERT INTO users (firstName, lastName, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
        [firstName, lastName, email, phone, hashedPassword, 'worker']
      );
      
      const userId = userResult[0].insertId;
      
      // 2. Create provider record
      await connection.execute(
        'INSERT INTO providers (user_id, experience_years, bio, service_radius_km, location_lat, location_lng, permanent_address, verified, active, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, providerData.experience_years, providerData.bio, providerData.service_radius_km, providerData.location_lat, providerData.location_lng, providerData.permanent_address, false, true, 0.0]
      );
      
      // 3. Create emergency contact record
      await connection.execute(
        'INSERT INTO emergency_contacts (user_id, contact_name, relationship, phone_number) VALUES (?, ?, ?, ?)',
        [userId, emergencyContactName, emergencyContactRelationship, emergencyContactPhone]
      );
      
      // 4. Create banking details record (with encryption)
      const encryptedAccountNumber = encrypt(accountNumber);
      await connection.execute(
        'INSERT INTO banking_details (user_id, bank_name, account_number_encrypted, ifsc_code, account_holder_name) VALUES (?, ?, ?, ?, ?)',
        [userId, bankName, JSON.stringify(encryptedAccountNumber), ifscCode, accountHolderName]
      );
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      // Generate JWT token
      const token = jwt.sign({ userId, role: 'worker' }, process.env.JWT_SECRET);
      
      res.status(201).json({
        message: 'Worker registered successfully',
        user: {
          id: userId,
          firstName,
          lastName,
          email,
          phone,
          role: 'worker'
        },
        token
      });
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
    
  } catch (error) {
    console.error('Worker registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});
```

## Admin Panel API Updates

### 1. Get Worker Details Endpoint
```javascript
router.get('/admin/workers/:id', async (req, res) => {
  try {
    const [userRows] = await db.execute(`
      SELECT 
        u.*,
        p.*,
        ec.contact_name as emergency_contact_name,
        ec.relationship as emergency_contact_relationship,
        ec.phone_number as emergency_contact_phone,
        bd.bank_name,
        bd.ifsc_code,
        bd.account_holder_name,
        bd.account_number_encrypted,
        bd.is_verified as bank_verified
      FROM users u
      LEFT JOIN providers p ON u.id = p.user_id
      LEFT JOIN emergency_contacts ec ON u.id = ec.user_id
      LEFT JOIN banking_details bd ON u.id = bd.user_id
      WHERE u.id = ? AND u.role = 'worker'
    `, [req.params.id]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    const worker = userRows[0];
    
    // Decrypt account number for admin view (only last 4 digits for security)
    if (worker.account_number_encrypted) {
      const decryptedAccountNumber = decrypt(JSON.parse(worker.account_number_encrypted));
      worker.account_number_masked = '****' + decryptedAccountNumber.slice(-4);
      delete worker.account_number_encrypted; // Don't send encrypted data
    }
    
    res.json(worker);
  } catch (error) {
    console.error('Error fetching worker details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
```

## Environment Variables

Add these to your `.env` file:

```env
# Encryption key for banking details (32-byte key)
ENCRYPTION_KEY=your-32-byte-encryption-key-here

# Database connection with updated schema
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

## Testing Checklist

### 1. Registration Testing
- [ ] Test worker registration with all new required fields
- [ ] Verify both email and phone are mandatory
- [ ] Test emergency contact validation
- [ ] Test banking details validation
- [ ] Test IFSC code format validation
- [ ] Verify account number encryption

### 2. Admin Panel Testing
- [ ] Test worker details display in admin panel
- [ ] Verify emergency contact information is shown
- [ ] Verify banking details are properly masked
- [ ] Test worker approval/rejection workflow

### 3. Security Testing
- [ ] Verify account numbers are encrypted in database
- [ ] Test that only authorized admins can view banking details
- [ ] Verify emergency contact data is properly stored
- [ ] Test data validation prevents malicious input

## Migration Scripts

### 1. Database Migration
```sql
-- migration_001_worker_requirements.sql
START TRANSACTION;

-- Add emergency contact fields to users table
ALTER TABLE users ADD COLUMN emergency_contact_name VARCHAR(255);
ALTER TABLE users ADD COLUMN emergency_contact_relationship ENUM('parent', 'spouse', 'sibling', 'child', 'friend', 'relative', 'other');
ALTER TABLE users ADD COLUMN emergency_contact_phone VARCHAR(20);

-- Add banking fields to users table
ALTER TABLE users ADD COLUMN bank_name VARCHAR(255);
ALTER TABLE users ADD COLUMN account_number_encrypted TEXT;
ALTER TABLE users ADD COLUMN ifsc_code VARCHAR(11);
ALTER TABLE users ADD COLUMN account_holder_name VARCHAR(255);

-- Make email and phone mandatory for existing users (update nulls first)
UPDATE users SET email = CONCAT('user', id, '@temp.com') WHERE email IS NULL OR email = '';
UPDATE users SET phone = CONCAT('999000', LPAD(id, 4, '0')) WHERE phone IS NULL OR phone = '';

ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL;
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;

COMMIT;
```

### 2. Data Migration for Existing Workers
```javascript
// migration script to handle existing workers
const migrateExistingWorkers = async () => {
  const [workers] = await db.execute('SELECT * FROM users WHERE role = "worker" AND emergency_contact_name IS NULL');
  
  for (const worker of workers) {
    // Prompt admin to add emergency contacts for existing workers
    console.log(`Worker ${worker.firstName} ${worker.lastName} needs emergency contact information`);
    
    // Set default values or prompt for manual entry
    await db.execute(
      'UPDATE users SET emergency_contact_name = ?, emergency_contact_relationship = ?, emergency_contact_phone = ? WHERE id = ?',
      ['To be updated', 'other', '0000000000', worker.id]
    );
  }
};
```

## Security Considerations

1. **Data Encryption**: All banking information must be encrypted at rest
2. **Access Control**: Only authorized admin users should access full banking details
3. **Audit Logging**: Log all access to sensitive worker information
4. **Data Masking**: Show only partial account numbers in admin interfaces
5. **Secure Transmission**: Use HTTPS for all API calls involving sensitive data

## Deployment Notes

1. **Environment Setup**: Ensure encryption keys are properly configured
2. **Database Backup**: Take full backup before running migrations
3. **Gradual Rollout**: Consider phased deployment for worker registration updates
4. **Monitoring**: Set up alerts for registration failures or validation errors
5. **Documentation**: Update API documentation with new field requirements 