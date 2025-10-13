const axios = require('axios');
require('dotenv').config();

async function testProviderAPI() {
  try {
    // Test the provider API endpoint directly
    const response = await axios.get('http://localhost:5001/api/admin/providers/7', {
      headers: {
        'Authorization': 'Bearer your-admin-token' // You'll need to replace this with a real token
      }
    });

    console.log('✅ Provider API Response:');
    console.log('Profile Picture URL:', response.data.data.profile_picture_url);
    console.log('Full response:', JSON.stringify(response.data.data, null, 2));

  } catch (error) {
    console.error('❌ Error calling provider API:', error.response?.data || error.message);
  }
}

// Also test the profile picture endpoint
async function testProfilePictureAPI() {
  try {
    const response = await axios.get('http://localhost:5001/api/admin/providers/7/profile-picture/presign', {
      headers: {
        'Authorization': 'Bearer your-admin-token'
      }
    });

    console.log('✅ Profile Picture API Response:', response.data);

  } catch (error) {
    console.log('❌ Profile Picture API Error (expected for provider without picture):');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
  }
}

console.log('Testing Provider API...');
testProviderAPI();

console.log('\nTesting Profile Picture API...');
testProfilePictureAPI();
