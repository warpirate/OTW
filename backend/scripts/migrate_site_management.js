const pool = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

async function migrateSiteManagement() {
  try {
    const dbName = process.env.DB_NAME || 'omw_db';
    console.log(`\n➡️  Starting site management migration on database: ${dbName}`);

    // Read the schema file
    const schemaPath = path.join(__dirname, '../database_updates/site_management_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    
    console.log('📋 Creating site management tables...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement.trim());
      }
    }
    
    console.log('✅ Site management tables created successfully');

    // Check if we need to insert seed data
    const [existingSettings] = await pool.query('SELECT COUNT(*) as count FROM site_settings');
    
    if (existingSettings[0].count === 0) {
      console.log('📋 Inserting seed data...');
      
      // Read the seed data file
      const seedPath = path.join(__dirname, '../database_updates/site_management_seed_data.sql');
      const seedSQL = await fs.readFile(seedPath, 'utf8');
      
      // Split by semicolons and execute each statement
      const seedStatements = seedSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of seedStatements) {
        if (statement.trim()) {
          try {
            await pool.query(statement.trim());
          } catch (error) {
            // Skip errors for duplicate key or missing audit_logs table
            if (!error.message.includes('Duplicate entry') && 
                !error.message.includes("Table 'omw_db.audit_logs' doesn't exist")) {
              console.warn('⚠️  Warning during seed data insertion:', error.message);
            }
          }
        }
      }
      
      console.log('✅ Seed data inserted successfully');
    } else {
      console.log('ℹ️  Site settings already exist, skipping seed data');
    }

    // Verify tables were created
    const tables = ['site_settings', 'content_pages', 'social_links', 'faqs', 'banners'];
    console.log('\n📊 Verifying table creation:');
    
    for (const table of tables) {
      try {
        const [result] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ ${table}: ${result[0].count} records`);
      } catch (error) {
        console.log(`❌ ${table}: Failed to verify - ${error.message}`);
      }
    }

    console.log('\n🎉 Site management migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test site management endpoints');
    console.log('   3. Access SuperAdmin panel to configure site settings');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSiteManagement()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateSiteManagement;
