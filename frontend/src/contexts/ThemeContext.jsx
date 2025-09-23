import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { isDarkMode, toggleTheme, addThemeListener } from '../app/utils/themeUtils';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => isDarkMode());

  useEffect(() => {
    // Set up theme listener
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });

    // Sync initial state
    setDarkMode(isDarkMode());

    return cleanup;
  }, []);

  const toggle = () => {
    const newDarkMode = toggleTheme();
    setDarkMode(newDarkMode);
    return newDarkMode;
  };

  const value = {
    darkMode,
    toggleTheme: toggle,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ThemeContext;
