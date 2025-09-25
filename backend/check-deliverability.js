// Email deliverability checker
require('dotenv').config();
const { sendTestEmail, sendVerificationEmail } = require('./services/emailService');

async function checkDeliverability() {
    console.log('🔍 Email Deliverability Checker');
    console.log('================================\n');
    
    const testEmail = 'tulasi12115045@gmail.com';
    
    console.log(`📧 Testing email delivery to: ${testEmail}`);
    console.log('This will send multiple test emails to check different scenarios:\n');
    
    try {
        // Test 1: Simple test email
        console.log('1️⃣ Sending simple test email...');
        const test1 = await sendTestEmail(testEmail);
        if (test1.success) {
            console.log('   ✅ Simple test email sent successfully');
            console.log('   📝 Message ID:', test1.messageId);
        } else {
            console.log('   ❌ Simple test email failed:', test1.error);
        }
        
        // Wait 2 seconds between emails
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 2: Verification email (like registration)
        console.log('\n2️⃣ Sending verification email (registration style)...');
        const verifyUrl = 'http://localhost:5173/verify-email?token=test123';
        const test2 = await sendVerificationEmail(testEmail, 'Test User', verifyUrl);
        if (test2.success) {
            console.log('   ✅ Verification email sent successfully');
            console.log('   📝 Message ID:', test2.messageId);
        } else {
            console.log('   ❌ Verification email failed:', test2.error);
        }
        
        console.log('\n🎯 Deliverability Check Results:');
        console.log('================================');
        
        if (test1.success && test2.success) {
            console.log('✅ Both emails sent successfully from server side!');
            console.log('\n🔍 If you\'re not receiving emails, check:');
            console.log('   1. 📁 Spam/Junk folder in Gmail');
            console.log('   2. 📁 Promotions tab in Gmail');
            console.log('   3. 📁 All Mail folder in Gmail');
            console.log('   4. 🔍 Search for "OTW" or "info@omwhub.com" in Gmail');
            console.log('   5. 📱 Check if Gmail is filtering emails automatically');
            
            console.log('\n💡 Tips to improve deliverability:');
            console.log('   • Add info@omwhub.com to your contacts');
            console.log('   • Mark any received emails as "Not Spam"');
            console.log('   • Check Gmail settings for blocked senders');
            
        } else {
            console.log('❌ Some emails failed to send. Check server configuration.');
        }
        
        console.log('\n📊 Email Headers Information:');
        console.log('   From: OTW Service <info@omwhub.com>');
        console.log('   SMTP: smtp.hostinger.com:465 (SSL/TLS)');
        console.log('   Authentication: Username/Password');
        
    } catch (error) {
        console.error('❌ Deliverability check failed:', error.message);
    }
}

checkDeliverability();
