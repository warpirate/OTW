const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'omw_database',
  multipleStatements: true
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting cash payment tables migration...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, '../database_updates/cash_payment_tracking.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
              error.code === 'ER_DUP_KEYNAME' || 
              error.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('🎉 Cash payment tables migration completed successfully!');
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'cash_payments'"
    );
    
    if (tables.length > 0) {
      console.log('✅ cash_payments table created successfully');
      
      // Show table structure
      const [structure] = await connection.execute('DESCRIBE cash_payments');
      console.log('📋 Table structure:');
      structure.forEach(column => {
        console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
      });
    } else {
      console.log('❌ cash_payments table was not created');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
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
  runMigration().catch(console.error);
}

module.exports = runMigration;
