const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database');

    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'providers' AND COLUMN_NAME = 'profile_picture_url'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('⚠️  Column profile_picture_url already exists, skipping migration');
      return;
    }

    console.log('🔄 Running migration: Add profile_picture_url to providers table');

    // Add the column and index
    await connection.execute(`
      ALTER TABLE providers 
      ADD COLUMN profile_picture_url VARCHAR(500) DEFAULT NULL AFTER bio,
      ADD INDEX idx_profile_picture (profile_picture_url(255))
    `);

    console.log('✅ Added profile_picture_url column and index');

    // Add comment
    await connection.execute(`
      ALTER TABLE providers 
      MODIFY COLUMN profile_picture_url VARCHAR(500) DEFAULT NULL 
      COMMENT 'S3 URL for worker profile picture'
    `);

    console.log('✅ Added column comment');
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

runMigration();
