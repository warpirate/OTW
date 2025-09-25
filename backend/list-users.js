// List all users in the database
require('dotenv').config();
const pool = require('./config/db');

async function listUsers() {
    console.log('👥 Listing All Users in Database');
    console.log('================================\n');
    
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, email_verified, email_verified_at, created_at FROM users ORDER BY created_at DESC LIMIT 10'
        );
        
        if (rows.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        console.log(`📊 Found ${rows.length} users (showing latest 10):\n`);
        
        rows.forEach((user, index) => {
            console.log(`${index + 1}. User ID: ${user.id}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Verified: ${user.email_verified ? '✅ YES' : '❌ NO'}`);
            console.log(`   Verified At: ${user.email_verified_at || 'Not verified'}`);
            console.log(`   Created: ${user.created_at}`);
            console.log('');
        });
        
        // Check if tulasi email exists with any variation
        const [searchRows] = await pool.query(
            'SELECT id, name, email, email_verified FROM users WHERE email LIKE ?',
            ['%tulasi%']
        );
        
        if (searchRows.length > 0) {
            console.log('🔍 Found users with "tulasi" in email:');
            searchRows.forEach(user => {
                console.log(`   ${user.email} (ID: ${user.id}, Verified: ${user.email_verified ? 'YES' : 'NO'})`);
            });
        } else {
            console.log('🔍 No users found with "tulasi" in email');
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        process.exit(0);
    }
}

listUsers();
