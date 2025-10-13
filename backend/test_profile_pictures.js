const mysql = require('mysql2/promise');
require('dotenv').config();

async function testProfilePictures() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database');

    // Check all providers and their profile pictures
    const [providers] = await connection.execute(`
      SELECT 
        p.id as provider_id,
        u.id as user_id,
        u.name,
        p.profile_picture_url
      FROM providers p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.id
    `);

    console.log('\n📋 All providers and their profile pictures:');
    providers.forEach(provider => {
      console.log(`  Provider ID: ${provider.provider_id} | User ID: ${provider.user_id} | Name: ${provider.name} | Picture: ${provider.profile_picture_url || 'None'}`);
    });

    // Check if any provider has a profile picture
    const providersWithPictures = providers.filter(p => p.profile_picture_url);
    console.log(`\n📊 Summary: ${providersWithPictures.length} out of ${providers.length} providers have profile pictures`);

    if (providersWithPictures.length > 0) {
      console.log('\n✅ Providers with profile pictures:');
      providersWithPictures.forEach(provider => {
        console.log(`  - ${provider.name} (ID: ${provider.provider_id}): ${provider.profile_picture_url}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testProfilePictures();
