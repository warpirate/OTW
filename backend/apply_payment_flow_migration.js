const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    // Create connection with multipleStatements enabled
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });
    
    console.log('✅ Connected to database:', process.env.DB_NAME);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database_updates', 'fix_payment_flow.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const sqlContent = await fs.readFile(migrationPath, 'utf8');
    
    console.log('🚀 Applying migration...\n');
    
    // Execute the migration
    const [results] = await connection.query(sqlContent);
    
    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Changes made:');
    console.log('   - Added total_amount, payment_method, payment_completed_at columns to bookings table');
    console.log('   - Populated total_amount with existing price/estimated_cost data');
    console.log('   - Updated payment_status from "unpaid" to "pending"');
    console.log('   - Added indexes for payment_status and payment_completed_at');
    console.log('   - Synced payment status with payments table');
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME IN ('total_amount', 'payment_method', 'payment_completed_at')
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    console.log('\n✅ New columns in bookings table:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    });
    
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings'
      AND INDEX_NAME IN ('idx_payment_status', 'idx_payment_completed')
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [process.env.DB_NAME]);
    
    if (indexes.length > 0) {
      console.log('\n✅ New indexes created:');
      indexes.forEach(idx => {
        console.log(`   - ${idx.INDEX_NAME} on ${idx.COLUMN_NAME}`);
      });
    }
    
    const [statusCount] = await connection.query(`
      SELECT payment_status, COUNT(*) as count
      FROM bookings
      GROUP BY payment_status
    `);
    
    console.log('\n📊 Payment status distribution:');
    statusCount.forEach(row => {
      console.log(`   - ${row.payment_status || 'NULL'}: ${row.count} bookings`);
    });
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('\n⚠️  Some columns already exist. This might mean the migration was partially applied.');
      console.log('   You may need to manually check and fix the database state.');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.log('\n⚠️  Some indexes already exist. This might mean the migration was partially applied.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the migration
console.log('═══════════════════════════════════════════════════════');
console.log('  Payment Flow Migration Script');
console.log('═══════════════════════════════════════════════════════\n');

applyMigration()
  .then(() => {
    console.log('\n✅ All done! Payment flow has been fixed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
