// Check user verification status in database
require('dotenv').config();
const pool = require('./config/db');

async function checkUserStatus() {
    console.log('🔍 Checking User Verification Status');
    console.log('====================================\n');
    
    const testEmail = 'tulasi12115045@gmail.com';
    
    try {
        console.log('📧 Looking up user with email:', testEmail);
        
        const [rows] = await pool.query(
            'SELECT id, name, email, email_verified, email_verified_at, created_at FROM users WHERE email = ? LIMIT 1', 
            [testEmail]
        );
        
        if (rows.length === 0) {
            console.log('❌ No user found with email:', testEmail);
            console.log('💡 This user needs to register first');
            return;
        }
        
        const user = rows[0];
        console.log('👤 User Details:');
        console.log('   ID:', user.id);
        console.log('   Name:', user.name);
        console.log('   Email:', user.email);
        console.log('   Email Verified:', user.email_verified ? '✅ YES' : '❌ NO');
        console.log('   Verified At:', user.email_verified_at || 'Not verified');
        console.log('   Created At:', user.created_at);
        
        if (user.email_verified) {
            console.log('\n🎉 This email is already verified!');
            console.log('💡 That\'s why resend verification returns success but doesn\'t send email');
            console.log('🔧 To test resend functionality:');
            console.log('   1. Create a new user account with different email');
            console.log('   2. Or manually set email_verified = 0 for this user');
        } else {
            console.log('\n📧 Email is NOT verified - resend should work');
            console.log('🔍 Check server logs to see if email was actually sent');
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkUserStatus();
