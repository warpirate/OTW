// Test resend verification functionality
require('dotenv').config();

async function testResendVerification() {
    console.log('🧪 Testing Resend Verification Functionality');
    console.log('============================================\n');
    
    const testEmail = 'tulasi12115045@gmail.com';
    
    try {
        console.log('📧 Testing resend verification for:', testEmail);
        
        const response = await fetch('http://localhost:5001/api/auth/resend-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: testEmail
            })
        });
        
        const result = await response.json();
        
        console.log('📊 Response Status:', response.status);
        console.log('📋 Response Body:', result);
        
        if (response.ok && result.success) {
            console.log('✅ Resend verification request successful!');
            console.log('💌 Check your email for the verification link');
        } else {
            console.log('❌ Resend verification failed');
            console.log('Error:', result.message || 'Unknown error');
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
        console.log('\n💡 Make sure your server is running on http://localhost:5001');
    }
    
    console.log('\n🔍 Check the server logs for detailed information about what happened');
}

testResendVerification();
