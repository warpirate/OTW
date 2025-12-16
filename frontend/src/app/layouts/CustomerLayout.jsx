import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import CustomerAssistantWidget from '../customer/components/CustomerAssistantWidget';

const CustomerLayout = () => {
  const [darkMode, setDarkMode] = useState(isDarkMode());

  useEffect(() => {
    // Set initial dark mode state
    setDarkMode(isDarkMode());
    
    // Add listener for theme changes
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <div className={`min-h-screen transition-colors customer-theme ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`} data-theme={darkMode ? 'dark' : 'light'}>
      <Outlet />
      <CustomerAssistantWidget />
    </div>
  );
};

export default CustomerLayout;
