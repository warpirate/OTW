import React, { useState, useEffect } from 'react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const Contact = () => {
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
            Contact Us
          </h1>
          <p className={`text-lg max-w-2xl mb-6 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Have a question or need help? Reach out to us!
          </p>
          <form className={`shadow rounded-lg p-6 w-full max-w-md mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
              <input 
                className={`w-full border rounded px-3 py-2 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`} 
                type="text" 
                placeholder="Your Name" 
              />
            </div>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input 
                className={`w-full border rounded px-3 py-2 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`} 
                type="email" 
                placeholder="you@email.com" 
              />
            </div>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Message</label>
              <textarea 
                className={`w-full border rounded px-3 py-2 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`} 
                rows="4" 
                placeholder="How can we help?" 
              />
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700" type="button">
              Send Message
            </button>
          </form>
          <div className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <p>123 Street, Toronto, ON, Canada</p>
            <p>Email: <a href="mailto:contact@otw.ca" className="text-blue-600 underline">contact@otw.ca</a></p>
            <p>Phone: <a href="tel:+1234567890" className="text-blue-600 underline">+1 234-567-8900</a></p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;