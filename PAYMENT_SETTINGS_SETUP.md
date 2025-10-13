# Payment & API Settings - Secure Credential Management

## Overview

This system provides secure, encrypted storage for payment gateway credentials and API keys in the database, replacing hardcoded `.env` values. All credentials are encrypted using AES-256-GCM encryption.

## Features

✅ **Encrypted Storage**: All sensitive credentials encrypted with AES-256-GCM  
✅ **Database Persistence**: Credentials stored securely in database  
✅ **Web UI Management**: SuperAdmin panel for easy credential management  
✅ **Audit Logging**: Complete tracking of all credential changes  
✅ **Automatic Fallback**: Falls back to .env if database unavailable  
✅ **Caching**: 5-minute cache to reduce database queries  

## Setup Instructions

### Step 1: Generate Master Encryption Key

The master encryption key is used to encrypt/decrypt all credentials. Generate a secure 256-bit key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add this to your `.env` file:

```env
MASTER_ENCRYPTION_KEY=<your_generated_key_here>
```

⚠️ **CRITICAL**: Never commit this key to version control. Keep it secure!

### Step 2: Run Database Migration

Execute the SQL schema to create required tables:

```bash
# Connect to your MySQL database and run:
mysql -u your_user -p your_database < backend/database_updates/payment_api_keys_schema.sql
```

This creates:
- `payment_api_keys` - Stores encrypted credentials
- `payment_key_audit_logs` - Tracks all changes
- `encryption_metadata` - Stores encryption algorithm info

### Step 3: Migrate Existing Credentials

Run the migration script to encrypt and move credentials from `.env` to database:

```bash
cd backend
node scripts/migrateEnvToDatabase.js
```

This will:
1. Read credentials from your `.env` file
2. Encrypt each credential using AES-256-GCM
3. Store encrypted values in database
4. Show migration summary

### Step 4: Verify in SuperAdmin Panel

1. Login to SuperAdmin panel: `http://localhost:5173/superadmin/login`
2. Navigate to **Payment Settings**
3. Verify all credentials are listed
4. Test decryption by clicking **Edit** on any credential

### Step 5: Update Your Code (Optional)

To use database credentials instead of `.env`, update your code:

**Before:**
```javascript
const razorpayKey = process.env.RAZORPAY_KEY_ID;
```

**After:**
```javascript
const apiKeyManager = require('./utils/apiKeyManager');
const razorpayKey = await apiKeyManager.getKey('RAZORPAY_KEY_ID');
```

**Or use helper methods:**
```javascript
const razorpayCredentials = await apiKeyManager.getRazorpayCredentials();
// Returns: { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET }
```

## API Endpoints

### SuperAdmin Endpoints

All endpoints require SuperAdmin authentication.

#### Get All Keys (Masked)
```
GET /api/superadmin/payment-settings
```

#### Get Decrypted Key
```
GET /api/superadmin/payment-settings/:id/decrypt
```

#### Update Key
```
PUT /api/superadmin/payment-settings/:id
Body: { key_value: "new_value", description: "..." }
```

#### Create New Key
```
POST /api/superadmin/payment-settings
Body: {
  key_name: "NEW_API_KEY",
  key_value: "value",
  key_type: "razorpay|google_maps|aws|jwt|email",
  is_sensitive: true,
  description: "..."
}
```

#### Delete Key
```
DELETE /api/superadmin/payment-settings/:id
```

#### Get Audit Logs
```
GET /api/superadmin/payment-settings/audit-logs/list
Query: ?page=1&limit=50&key_name=RAZORPAY&action=updated
```

## Security Features

### Encryption
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **IV**: Random 16-byte IV for each encryption
- **Auth Tag**: 16-byte authentication tag prevents tampering
- **Key Size**: 256-bit master key

### Access Control
- Only SuperAdmin role can access payment settings
- All access logged with IP address and user agent
- JWT token required for all operations

### Audit Trail
- Every view, create, update, delete operation logged
- SHA256 hash of values stored for verification
- IP address and user agent tracked
- Cannot be deleted (only soft delete)

### Data Protection
- Sensitive values masked in UI (••••••••)
- Passwords never logged in plaintext
- Database values encrypted at rest
- Automatic fallback to .env if decryption fails

## API Key Manager Usage

### Basic Usage

```javascript
const apiKeyManager = require('./utils/apiKeyManager');

// Get single key
const razorpayKey = await apiKeyManager.getKey('RAZORPAY_KEY_ID');

// Get multiple keys
const keys = await apiKeyManager.getKeys(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);

// Get all Razorpay credentials
const razorpay = await apiKeyManager.getRazorpayCredentials();
console.log(razorpay.RAZORPAY_KEY_ID);
console.log(razorpay.RAZORPAY_KEY_SECRET);

// Get AWS credentials
const aws = await apiKeyManager.getAWSCredentials();

// Get Email credentials
const email = await apiKeyManager.getEmailCredentials();

// Get JWT credentials
const jwt = await apiKeyManager.getJWTCredentials();

// Get Google Maps key
const mapsKey = await apiKeyManager.getGoogleMapsKey();
```

### Cache Management

```javascript
// Clear specific key cache
apiKeyManager.clearCache('RAZORPAY_KEY_ID');

// Clear all cache
apiKeyManager.clearCache();

// Refresh all keys from database
await apiKeyManager.refreshCache();

// Disable cache for specific request
const key = await apiKeyManager.getKey('RAZORPAY_KEY_ID', false);
```

## Migrated Credentials

The following credentials are automatically migrated:

### JWT Settings
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRATION` - Token expiration time

### AWS Settings
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `AWS_BUCKET_NAME` - S3 bucket name

### Email Settings
- `USER_GMAIL` - SMTP email address
- `USER_PASSWORD` - SMTP password

### Razorpay Settings
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay secret
- `RAZORPAY_WEBHOOK_SECRET` - Webhook signature secret

### Google Maps
- `GOOGLE_MAPS_API_KEY` - Maps API key

## Troubleshooting

### Migration Issues

**Problem**: "MASTER_ENCRYPTION_KEY not found"
```bash
# Generate and add to .env:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Problem**: "Key already exists in database"
- Keys are already migrated, skip or delete from database first

**Problem**: "Decryption failed"
- Check MASTER_ENCRYPTION_KEY matches the one used for encryption
- Ensure database values weren't manually modified

### Runtime Issues

**Problem**: API key returns null
- Check if key exists in database: `SELECT * FROM payment_api_keys WHERE key_name = 'KEY_NAME'`
- Verify key is active: `is_active = TRUE`
- Check encryption key is correct

**Problem**: "Failed to decrypt data"
- MASTER_ENCRYPTION_KEY may have changed
- Database value may be corrupted
- Falls back to .env automatically

## Best Practices

1. **Backup Before Migration**: Always backup your database before running migration
2. **Keep .env Backup**: Keep original .env file as backup until fully tested
3. **Rotate Keys Regularly**: Update credentials periodically via SuperAdmin panel
4. **Monitor Audit Logs**: Regularly check audit logs for unauthorized access
5. **Secure Master Key**: Never commit MASTER_ENCRYPTION_KEY to version control
6. **Use Environment Variables**: Keep MASTER_ENCRYPTION_KEY in .env, not in database
7. **Test After Migration**: Verify all services work before removing .env values

## Files Created

### Backend
- `backend/database_updates/payment_api_keys_schema.sql` - Database schema
- `backend/routes/admin_management/paymentSettings.js` - API routes
- `backend/utils/encryption.js` - Encryption utility
- `backend/utils/apiKeyManager.js` - Key management utility
- `backend/scripts/migrateEnvToDatabase.js` - Migration script

### Frontend
- `frontend/src/app/services/paymentSettings.service.js` - API service
- `frontend/src/app/features/superadmin/PaymentSettings.jsx` - UI component

### Configuration
- Updated `backend/server.js` - Added payment settings route
- Updated `frontend/src/App.jsx` - Added payment settings page route
- Updated `frontend/src/app/layouts/SuperAdminLayout.jsx` - Added navigation link

## Support

For issues or questions:
1. Check audit logs in SuperAdmin panel
2. Review backend logs for encryption errors
3. Verify MASTER_ENCRYPTION_KEY is set correctly
4. Ensure database tables exist and have correct schema

## Security Considerations

⚠️ **Important Security Notes**:

1. **Master Encryption Key**: This is the most critical secret. If compromised, all credentials are at risk.
2. **Database Access**: Limit database access to authorized personnel only.
3. **Audit Logs**: Regularly review audit logs for suspicious activity.
4. **Key Rotation**: Implement a key rotation policy for production.
5. **Backup Security**: Ensure database backups are also encrypted.
6. **Network Security**: Use SSL/TLS for all database connections.

## Production Deployment

Before deploying to production:

1. ✅ Generate strong MASTER_ENCRYPTION_KEY (64 hex characters)
2. ✅ Run database migration on production database
3. ✅ Migrate all credentials using migration script
4. ✅ Test all services thoroughly
5. ✅ Remove sensitive values from .env (keep MASTER_ENCRYPTION_KEY)
6. ✅ Backup database with encrypted credentials
7. ✅ Set up monitoring for audit logs
8. ✅ Document key rotation procedures

## License

This implementation follows industry-standard encryption practices and is designed for production use.
