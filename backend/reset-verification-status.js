// Reset email verification status for testing
require('dotenv').config();
const pool = require('./config/db');

async function resetVerificationStatus() {
    console.log('🔧 Reset Email Verification Status');
    console.log('===================================\n');
    
    const testEmail = 'tulasi12115045@gmail.com';
    
    try {
        console.log('📧 Looking up user with email:', testEmail);
        
        // First check current status
        const [rows] = await pool.query(
            'SELECT id, name, email, email_verified, email_verified_at FROM users WHERE email = ? LIMIT 1', 
            [testEmail]
        );
        
        if (rows.length === 0) {
            console.log('❌ No user found with email:', testEmail);
            return;
        }
        
        const user = rows[0];
        console.log('👤 Current User Status:');
        console.log('   ID:', user.id);
        console.log('   Name:', user.name);
        console.log('   Email Verified:', user.email_verified ? '✅ YES' : '❌ NO');
        console.log('   Verified At:', user.email_verified_at || 'Not verified');
        
        if (user.email_verified) {
            console.log('\n🔄 Resetting verification status to allow testing...');
            
            await pool.query(
                'UPDATE users SET email_verified = 0, email_verified_at = NULL WHERE email = ?',
                [testEmail]
            );
            
            console.log('✅ Email verification status reset!');
            console.log('💡 Now you can test the "Resend Email" functionality');
            console.log('📧 The resend verification endpoint should now send emails');
            
        } else {
            console.log('\n✅ Email is already unverified - resend should work');
        }
        
        // Verify the change
        const [updatedRows] = await pool.query(
            'SELECT email_verified, email_verified_at FROM users WHERE email = ? LIMIT 1', 
            [testEmail]
        );
        
        const updatedUser = updatedRows[0];
        console.log('\n📊 Updated Status:');
        console.log('   Email Verified:', updatedUser.email_verified ? '✅ YES' : '❌ NO');
        console.log('   Verified At:', updatedUser.email_verified_at || 'Not verified');
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        process.exit(0);
    }
}

resetVerificationStatus();
