const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database:', process.env.DB_NAME);

    // Check table structure
    const [columns] = await connection.execute(`
      DESCRIBE providers
    `);

    console.log('\n📋 Providers table structure:');
    columns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
    });

    // Check if profile_picture_url exists
    const profilePictureColumn = columns.find(col => col.Field === 'profile_picture_url');
    
    if (profilePictureColumn) {
      console.log('\n✅ profile_picture_url column exists!');
      console.log('   Type:', profilePictureColumn.Type);
      console.log('   Null:', profilePictureColumn.Null);
      console.log('   Default:', profilePictureColumn.Default);
    } else {
      console.log('\n❌ profile_picture_url column NOT found!');
    }

    // Test a simple query
    console.log('\n🔍 Testing query...');
    const [testResult] = await connection.execute(`
      SELECT id, profile_picture_url FROM providers LIMIT 1
    `);
    
    console.log('✅ Query successful! Sample result:', testResult[0] || 'No records found');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTable();
