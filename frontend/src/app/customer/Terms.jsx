import React, { useState, useEffect } from 'react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const Terms = () => {
  const [darkMode, setDarkMode] = useState(isDarkMode());

  // Listen for theme changes
  useEffect(() => {
    // Update dark mode state when theme changes
    const removeListener = addThemeListener(() => {
      setDarkMode(isDarkMode());
    });
    
    return () => {
      // Clean up listener on component unmount
      removeListener();
    };
  }, []);

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header />
      <div className="container-custom py-12">
        <div className="flex flex-col items-center justify-center px-4 py-12">
          <h1 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Terms & Conditions
          </h1>
          <div className={`max-w-2xl space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>Welcome to OMW! By using our website and services, you agree to the following terms and conditions. Please read them carefully.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              1. Use of Service
            </h2>
            <p>You agree to use OMW only for lawful purposes and in accordance with these terms.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              2. User Accounts
            </h2>
            <p>You are responsible for maintaining the confidentiality of your account and password.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              3. Service Provider Responsibility
            </h2>
            <p>Service providers are independent contractors. OMW is not liable for their actions.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              4. Limitation of Liability
            </h2>
            <p>OMW is not liable for any damages arising from the use of our services.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              5. Changes to Terms
            </h2>
            <p>We may update these terms at any time. Continued use of OMW means you accept the new terms.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;