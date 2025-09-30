// Test file to verify multi-role logout behavior
// Run this in browser console to test the logout fix

const testMultiRoleLogout = () => {
  console.log('🧪 Testing Multi-Role Logout Behavior...\n');
  
  // Clear all existing tokens first
  localStorage.clear();
  
  // Simulate having both customer and worker logged in
  console.log('1. Simulating customer and worker login...');
  
  // Mock customer token (expires in 1 hour)
  const customerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiY3VzdG9tZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiY3VzdG9tZXIiLCJleHAiOjE3MzAzNzI4MDAsImlhdCI6MTczMDM2OTIwMH0.test';
  const customerUser = { id: 1, email: 'customer@example.com', role: 'customer', name: 'Test Customer' };
  
  // Mock worker token (expires in 1 hour)  
  const workerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoid29ya2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IndvcmtlciIsImV4cCI6MTczMDM3MjgwMCwiaWF0IjoxNzMwMzY5MjAwfQ.test';
  const workerUser = { id: 2, email: 'worker@example.com', role: 'worker', name: 'Test Worker' };
  
  // Store customer tokens
  localStorage.setItem('jwt_token_customer', customerToken);
  localStorage.setItem('user_info_customer', JSON.stringify(customerUser));
  
  // Store worker tokens
  localStorage.setItem('jwt_token_worker', workerToken);
  localStorage.setItem('user_info_worker', JSON.stringify(workerUser));
  
  // Set current role to worker (simulating worker logged in first)
  localStorage.setItem('current_role', 'worker');
  
  // Now simulate customer login (this should NOT overwrite current_role)
  console.log('   Simulating customer login after worker...');
  if (typeof AuthService !== 'undefined') {
    // This simulates what happens when customer logs in after worker
    AuthService._storeTokens(customerToken, customerUser);
  }
  
  console.log('✅ Both roles logged in');
  console.log('   Customer token:', localStorage.getItem('jwt_token_customer') ? '✅ Present' : '❌ Missing');
  console.log('   Worker token:', localStorage.getItem('jwt_token_worker') ? '✅ Present' : '❌ Missing');
  console.log('   Current role:', localStorage.getItem('current_role'));
  
  // Test logout worker only
  console.log('\n2. Logging out worker...');
  
  // Import AuthService (assuming it's available globally or import it)
  if (typeof AuthService !== 'undefined') {
    AuthService.logout(null, 'worker');
    
    console.log('✅ Worker logout completed');
    console.log('   Customer token:', localStorage.getItem('jwt_token_customer') ? '✅ Still present' : '❌ Removed (BUG!)');
    console.log('   Worker token:', localStorage.getItem('jwt_token_worker') ? '❌ Still present (BUG!)' : '✅ Removed');
    console.log('   Current role:', localStorage.getItem('current_role') || 'null');
    
    // Test customer authentication
    console.log('\n3. Testing customer authentication...');
    const isCustomerLoggedIn = AuthService.isLoggedIn('customer');
    const customerData = AuthService.getCurrentUser('customer');
    
    console.log('   Customer still logged in:', isCustomerLoggedIn ? '✅ Yes' : '❌ No (BUG!)');
    console.log('   Customer data available:', customerData ? '✅ Yes' : '❌ No (BUG!)');
    
    if (isCustomerLoggedIn && customerData) {
      console.log('\n🎉 SUCCESS: Worker logout did not affect customer session!');
    } else {
      console.log('\n❌ FAILURE: Worker logout affected customer session');
    }
  } else {
    console.log('❌ AuthService not available. Please run this test in the application context.');
  }
  
  console.log('\n🧪 Test completed. Check the results above.');
};

// Export for use in browser console
window.testMultiRoleLogout = testMultiRoleLogout;

console.log('Multi-role logout test loaded. Run testMultiRoleLogout() in console to test.');
