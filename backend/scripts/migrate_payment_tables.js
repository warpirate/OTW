const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME,
  multipleStatements: true
};

async function migratePaymentTables() {
  let connection;
  
  try {
    console.log('🔄 Starting payment tables migration...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Read and execute the SQL migration file
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, '../database_updates/payment_tables.sql');
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error('Migration SQL file not found');
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the migration
    await connection.execute(sqlContent);
    console.log('✅ Payment tables migration completed successfully');
    
    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('upi_payment_methods', 'upi_transactions')
    `, [process.env.DB_NAME]);
    
    console.log('📋 Created tables:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });
    
    // Check if existing payments table was updated
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'payments' 
      AND COLUMN_NAME IN ('upi_transaction_id', 'payment_type')
    `, [process.env.DB_NAME]);
    
    if (columns.length > 0) {
      console.log('📋 Updated payments table with new columns:');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}`);
      });
    }
    
    // Check if bookings table was updated
    const [bookingColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'bookings' 
      AND COLUMN_NAME = 'upi_payment_method_id'
    `, [process.env.DB_NAME]);
    
    if (bookingColumns.length > 0) {
      console.log('📋 Updated bookings table with new column:');
      console.log('   - upi_payment_method_id');
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migratePaymentTables();
}

module.exports = migratePaymentTables;
