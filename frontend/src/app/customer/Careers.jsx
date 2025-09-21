import React, { useState, useEffect } from 'react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const Careers = () => {
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
            Careers at OMW
          </h1>
          <p className={`text-lg max-w-2xl mb-6 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Join our growing team and help us revolutionize the home services industry! We're always looking for passionate, talented individuals.
          </p>
          <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Open Positions
          </h2>
          <ul className={`text-left max-w-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
            <li className="mb-2"><strong>Frontend Developer</strong> – Remote/Hybrid – <span className="text-green-600">Open</span></li>
            <li className="mb-2"><strong>Customer Support Specialist</strong> – Toronto, ON – <span className="text-green-600">Open</span></li>
            <li className="mb-2"><strong>Service Provider (Plumber, Electrician, etc.)</strong> – Multiple Locations – <span className="text-green-600">Open</span></li>
          </ul>
          <p className={`max-w-xl text-center mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Don't see a role that fits? Email your resume to <a href="mailto:careers@otw.ca" className="text-blue-600 underline">careers@otw.ca</a> and we'll get in touch!
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
            Apply Now
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Careers;