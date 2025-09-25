// Quick email test with different providers
require('dotenv').config();
const { sendTestEmail } = require('./services/emailService');

async function quickTest() {
    console.log('🚀 Quick Email Test');
    console.log('===================\n');
    
    // Test with different email providers
    const testEmails = [
        'tulasi12115045@gmail.com',  // Gmail
        // Add other emails if you have them:
        // 'your-email@outlook.com',    // Outlook
        // 'your-email@yahoo.com',      // Yahoo
    ];
    
    for (const email of testEmails) {
        console.log(`📧 Testing: ${email}`);
        try {
            const result = await sendTestEmail(email);
            if (result.success) {
                console.log(`   ✅ SUCCESS - Message ID: ${result.messageId}`);
            } else {
                console.log(`   ❌ FAILED - Error: ${result.error}`);
            }
        } catch (error) {
            console.log(`   ❌ ERROR - ${error.message}`);
        }
        
        // Wait 1 second between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Check spam folders in all email accounts');
    console.log('2. Search for "OTW" or "info@omwhub.com"');
    console.log('3. Add info@omwhub.com to contacts');
    console.log('4. If still no emails, the domain might need SPF/DKIM setup');
}

quickTest();
