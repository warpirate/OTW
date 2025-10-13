/**
 * Migration Script: Encrypt and Move .env Credentials to Database
 * 
 * This script reads sensitive credentials from .env file,
 * encrypts them using AES-256-GCM, and stores them in the database.
 * 
 * Usage: node scripts/migrateEnvToDatabase.js
 */

require('dotenv').config();
const pool = require('../config/db');
const encryption = require('../utils/encryption');

const CREDENTIALS_TO_MIGRATE = [
  // JWT Settings
  {
    key_name: 'JWT_SECRET',
    key_type: 'jwt',
    description: 'Secret key for JWT token signing',
    is_sensitive: true
  },
  {
    key_name: 'JWT_EXPIRATION',
    key_type: 'jwt',
    description: 'JWT token expiration time',
    is_sensitive: false
  },
  
  // AWS Settings
  {
    key_name: 'AWS_ACCESS_KEY_ID',
    key_type: 'aws',
    description: 'AWS access key for S3 and other services',
    is_sensitive: true
  },
  {
    key_name: 'AWS_SECRET_ACCESS_KEY',
    key_type: 'aws',
    description: 'AWS secret access key',
    is_sensitive: true
  },
  {
    key_name: 'AWS_REGION',
    key_type: 'aws',
    description: 'AWS region for services',
    is_sensitive: false
  },
  {
    key_name: 'AWS_BUCKET_NAME',
    key_type: 'aws',
    description: 'S3 bucket name for file storage',
    is_sensitive: false
  },
  
  // Email Settings
  {
    key_name: 'USER_GMAIL',
    key_type: 'email',
    description: 'Email address for SMTP (Hostinger)',
    is_sensitive: false
  },
  {
    key_name: 'USER_PASSWORD',
    key_type: 'email',
    description: 'Email password for SMTP authentication',
    is_sensitive: true
  },
  
  // Razorpay Settings
  {
    key_name: 'RAZORPAY_KEY_ID',
    key_type: 'razorpay',
    description: 'Razorpay API key ID for payment processing',
    is_sensitive: true
  },
  {
    key_name: 'RAZORPAY_KEY_SECRET',
    key_type: 'razorpay',
    description: 'Razorpay API secret key',
    is_sensitive: true
  },
  {
    key_name: 'RAZORPAY_WEBHOOK_SECRET',
    key_type: 'razorpay',
    description: 'Razorpay webhook secret for signature verification',
    is_sensitive: true
  },
  
  // Google Maps Settings
  {
    key_name: 'GOOGLE_MAPS_API_KEY',
    key_type: 'google_maps',
    description: 'Google Maps API key for geocoding and maps',
    is_sensitive: true
  }
];

async function migrateCredentials() {
  console.log('🔐 Starting credential migration to database...\n');
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const credential of CREDENTIALS_TO_MIGRATE) {
      try {
        const envValue = process.env[credential.key_name];
        
        if (!envValue) {
          console.log(`⚠️  Skipping ${credential.key_name}: Not found in .env`);
          skipped++;
          continue;
        }
        
        // Check if already exists
        const [existing] = await connection.query(
          'SELECT id FROM payment_api_keys WHERE key_name = ?',
          [credential.key_name]
        );
        
        if (existing.length > 0) {
          console.log(`⏭️  Skipping ${credential.key_name}: Already exists in database`);
          skipped++;
          continue;
        }
        
        // Encrypt the value
        const encryptedValue = encryption.encrypt(envValue);
        
        // Insert into database
        await connection.query(
          `INSERT INTO payment_api_keys 
           (key_name, key_value, key_type, is_sensitive, description, is_active)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [
            credential.key_name,
            encryptedValue,
            credential.key_type,
            credential.is_sensitive,
            credential.description
          ]
        );
        
        console.log(`✅ Migrated ${credential.key_name} (${credential.key_type})`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ Error migrating ${credential.key_name}:`, error.message);
        errors++;
      }
    }
    
    await connection.commit();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⏭️  Skipped (already exists): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    
    if (migrated > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📝 Next Steps:');
      console.log('1. Verify the credentials in SuperAdmin > Payment Settings');
      console.log('2. Test your application to ensure all services work correctly');
      console.log('3. Once verified, you can remove sensitive values from .env file');
      console.log('4. Keep MASTER_ENCRYPTION_KEY in .env - this is required for decryption');
      console.log('\n⚠️  IMPORTANT: Backup your database before removing .env values!');
    }
    
  } catch (error) {
    await connection.rollback();
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Check for master encryption key
if (!process.env.MASTER_ENCRYPTION_KEY) {
  console.error('\n❌ ERROR: MASTER_ENCRYPTION_KEY not found in .env');
  console.log('\n📝 To generate a secure encryption key, run:');
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('\nThen add it to your .env file:');
  console.log('   MASTER_ENCRYPTION_KEY=<generated_key>');
  process.exit(1);
}

// Run migration
migrateCredentials()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
