import React from 'react';

const Terms = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
    <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
    <div className="max-w-2xl text-gray-700 space-y-4">
      <p>Welcome to OTW! By using our website and services, you agree to the following terms and conditions. Please read them carefully.</p>
      <h2 className="text-2xl font-semibold mt-4">1. Use of Service</h2>
      <p>You agree to use OTW only for lawful purposes and in accordance with these terms.</p>
      <h2 className="text-2xl font-semibold mt-4">2. User Accounts</h2>
      <p>You are responsible for maintaining the confidentiality of your account and password.</p>
      <h2 className="text-2xl font-semibold mt-4">3. Service Provider Responsibility</h2>
      <p>Service providers are independent contractors. OTW is not liable for their actions.</p>
      <h2 className="text-2xl font-semibold mt-4">4. Limitation of Liability</h2>
      <p>OTW is not liable for any damages arising from the use of our services.</p>
      <h2 className="text-2xl font-semibold mt-4">5. Changes to Terms</h2>
      <p>We may update these terms at any time. Continued use of OTW means you accept the new terms.</p>
    </div>
  </div>
);

export default Terms;