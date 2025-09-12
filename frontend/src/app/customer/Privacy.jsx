import React, { useState, useEffect } from 'react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const Privacy = () => {
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
            Privacy Policy
          </h1>
          <div className={`max-w-2xl space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>Your privacy is important to us. This policy explains how OMW collects, uses, and protects your information.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              1. Information We Collect
            </h2>
            <p>We collect information you provide when you use our services, such as your name, email, and address.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              2. How We Use Information
            </h2>
            <p>We use your information to provide and improve our services, and to communicate with you.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              3. Sharing Information
            </h2>
            <p>We do not sell your personal information. We may share it with service providers as needed to deliver our services.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              4. Data Security
            </h2>
            <p>We implement security measures to protect your data from unauthorized access.</p>
            <h2 className={`text-2xl font-semibold mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              5. Changes to Policy
            </h2>
            <p>We may update this policy. Continued use of OMW means you accept the new policy.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;