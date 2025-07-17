/**
 * Initialize theme from localStorage and set up event listeners for theme changes
 */
export const initializeTheme = () => {
  // Check if user has a theme preference in localStorage
  const userPrefersDark = localStorage.getItem('prefersDarkMode') === 'true';
  
  // Apply the theme
  if (userPrefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  // Listen for changes in localStorage made by other components
  window.addEventListener('storage', (event) => {
    if (event.key === 'prefersDarkMode') {
      if (event.newValue === 'true') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  });
};

/**
 * Toggle theme between dark and light
 * @returns {boolean} The new dark mode state
 */
export const toggleTheme = () => {
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const newDarkMode = !isDarkMode;
  
  // Update localStorage
  localStorage.setItem('prefersDarkMode', newDarkMode.toString());
  
  // Update theme
  if (newDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  return newDarkMode;
};

/**
 * Get the current theme state
 * @returns {boolean} True if dark mode is active
 */
export const isDarkMode = () => {
  return document.documentElement.getAttribute('data-theme') === 'dark';
};

/**
 * Add an event listener for theme changes
 * @param {Function} callback - Function to call when theme changes
 * @returns {Function} Cleanup function to remove the listener
 */
export const addThemeListener = (callback) => {
  const storageListener = (event) => {
    if (event.key === 'prefersDarkMode') {
      callback(isDarkMode());
    }
  };
  
  window.addEventListener('storage', storageListener);
  return () => window.removeEventListener('storage', storageListener);
};
