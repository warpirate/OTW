// Test user registration process
require('dotenv').config();

async function testRegistration() {
    console.log('🧪 Testing User Registration');
    console.log('============================\n');
    
    const testUser = {
        firstName: 'Tulasi',
        lastName: 'Test',
        email: 'tulasi12115045@gmail.com',
        password: 'testpassword123',
        phone_number: '1234567890'
    };
    
    try {
        console.log('📝 Attempting to register user:', testUser.email);
        
        const response = await fetch('http://localhost:5001/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testUser)
        });
        
        const result = await response.json();
        
        console.log('📊 Registration Response Status:', response.status);
        console.log('📋 Registration Response Body:', JSON.stringify(result, null, 2));
        
        if (response.ok && result.token) {
            console.log('✅ Registration successful!');
            console.log('👤 User ID:', result.user.id);
            console.log('📧 Email verification sent:', result.email_verification_sent);
            console.log('🔑 JWT Token received');
            
            console.log('\n💡 Now try the "Resend Email" button - it should work!');
        } else {
            console.log('❌ Registration failed');
            if (result.message) {
                console.log('Error:', result.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
        console.log('\n💡 Make sure your server is running on http://localhost:5001');
    }
}

testRegistration();
