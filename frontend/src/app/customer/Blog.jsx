import React, { useState, useEffect } from 'react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const Blog = () => {
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
            OMW Blog
          </h1>
          <p className={`text-lg max-w-2xl mb-8 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Tips, stories, and updates from the world of home services.
          </p>
          <div className="max-w-2xl w-full space-y-8">
            <div className={`shadow rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                5 Ways to Keep Your Home Safe and Clean
              </h2>
              <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Discover simple tips to maintain a healthy and safe environment for your family.
              </p>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                Posted on May 1, 2024
              </span>
            </div>
            <div className={`shadow rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                How OMW Selects Trusted Professionals
              </h2>
              <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Learn about our vetting process and why you can trust OMW for your home service needs.
              </p>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                Posted on April 20, 2024
              </span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Blog;