// Standalone email test script
require('dotenv').config();
const { sendTestEmail, verifyTransporter } = require('./services/emailService');

async function testEmailService() {
    console.log('========================================');
    console.log('📧 OTW Email Service Test');
    console.log('========================================\n');
    
    // Check environment variables
    console.log('1️⃣ Checking environment variables...');
    console.log('   USER_GMAIL:', process.env.USER_GMAIL ? '✅ Set' : '❌ Missing');
    console.log('   USER_PASSWORD:', process.env.USER_PASSWORD ? '✅ Set' : '❌ Missing');
    console.log('   From Address:', process.env.USER_GMAIL || 'info@omwhub.com');
    console.log('');
    
    if (!process.env.USER_GMAIL || !process.env.USER_PASSWORD) {
        console.error('❌ Email credentials are missing!');
        console.error('   Please set USER_GMAIL and USER_PASSWORD in your .env file');
        process.exit(1);
    }
    
    // Verify transporter
    console.log('2️⃣ Verifying email transporter configuration...');
    const isConfigured = await verifyTransporter();
    
    if (!isConfigured) {
        console.error('\n❌ Email transporter verification failed!');
        console.error('   Please check:');
        console.error('   - Your internet connection');
        console.error('   - SMTP credentials are correct');
        console.error('   - Hostinger SMTP settings');
        console.error('   - Firewall/antivirus not blocking port 465');
        process.exit(1);
    }
    
    console.log('✅ Email transporter verified successfully!\n');
    
    // Get test email address
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('3️⃣ Enter email address to send test email to: ', async (email) => {
        if (!email || !email.includes('@')) {
            console.error('❌ Invalid email address');
            rl.close();
            process.exit(1);
        }
        
        console.log(`\n4️⃣ Sending test email to ${email}...`);
        
        try {
            const result = await sendTestEmail(email);
            
            if (result.success) {
                console.log('\n✅ SUCCESS! Test email sent successfully!');
                console.log('   Message ID:', result.messageId);
                console.log('   Check your inbox (and spam folder) for the test email.');
                console.log('\n🎉 Your email service is working correctly!');
            } else {
                console.error('\n❌ Failed to send test email');
                console.error('   Error:', result.error);
                console.error('   Attempts made:', result.attempts || 1);
            }
        } catch (error) {
            console.error('\n❌ Unexpected error:', error.message);
        }
        
        console.log('\n========================================');
        console.log('Test completed');
        console.log('========================================');
        
        rl.close();
        process.exit(0);
    });
}

// Run the test
testEmailService().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
