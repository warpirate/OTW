import React, { useState, useEffect } from 'react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const AboutUs = () => {
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
            About OTW
          </h1>
          <p className={`text-lg max-w-2xl mb-6 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            OTW is your trusted partner for professional home services. Our mission is to make your life easier by connecting you with skilled, vetted professionals for all your household needs.
          </p>
          <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Our Vision
          </h2>
          <p className={`max-w-xl mb-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            To be the most reliable and customer-centric platform for home services, ensuring safety, quality, and convenience for every household.
          </p>
          <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Our Story
          </h2>
          <p className={`max-w-xl text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Founded in 2024, OTW was born out of the need for trustworthy and hassle-free home services. We believe in empowering both customers and service providers through technology, transparency, and a commitment to excellence.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutUs;