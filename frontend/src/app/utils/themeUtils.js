/**
 * Check if current page is a customer page
 */
const isCustomerPage = () => {
  const path = window.location.pathname;
  return !path.startsWith('/admin') && !path.startsWith('/superadmin') && !path.startsWith('/worker');
};

/**
 * Initialize theme from localStorage and set up event listeners for theme changes
 * This function should be called early in the app lifecycle to prevent theme flashing
 * Only applies to customer pages
 */
export const initializeTheme = () => {
  // Only initialize theme for customer pages
  if (!isCustomerPage()) {
    document.documentElement.setAttribute('data-theme-initialized', 'true');
    return;
  }

  // Prevent flash by setting theme immediately (before React renders)
  const userPrefersDark = localStorage.getItem('prefersDarkMode') === 'true';
  
  // Add customer-theme class to enable CSS variables
  document.documentElement.classList.add('customer-theme');
  document.body.classList.add('customer-theme');
  
  // Apply the theme immediately
  if (userPrefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
  
  // Mark theme as initialized to show content (prevents CSS-based hiding)
  document.documentElement.setAttribute('data-theme-initialized', 'true');

  // Listen for changes in localStorage made by other tabs/windows
  const handleStorageChange = (event) => {
    if (event.key === 'prefersDarkMode' && isCustomerPage()) {
      const isDark = event.newValue === 'true';
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
      
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { isDarkMode: isDark } 
      }));
    }
  };

  // Add the storage listener
  window.addEventListener('storage', handleStorageChange);
};

/**
 * Toggle theme between dark and light
 * Only works on customer pages
 * @returns {boolean} The new dark mode state
 */
export const toggleTheme = () => {
  // Only allow theme toggle on customer pages
  if (!isCustomerPage()) {
    return false;
  }

  const currentDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const newDarkMode = !currentDarkMode;
  
  // Update localStorage first
  localStorage.setItem('prefersDarkMode', newDarkMode.toString());
  
  // Apply theme changes immediately
  if (newDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
  
  // Dispatch custom event for same-tab components to listen to
  window.dispatchEvent(new CustomEvent('themeChanged', { 
    detail: { isDarkMode: newDarkMode } 
  }));
  
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
 * Add an event listener for theme changes (both storage and custom events)
 * @param {Function} callback - Function to call when theme changes
 * @returns {Function} Cleanup function to remove the listeners
 */
export const addThemeListener = (callback) => {
  const storageListener = (event) => {
    if (event.key === 'prefersDarkMode') {
      callback(event.newValue === 'true');
    }
  };
  
  const customListener = (event) => {
    callback(event.detail.isDarkMode);
  };
  
  // Listen to both storage events (cross-tab) and custom events (same-tab)
  window.addEventListener('storage', storageListener);
  window.addEventListener('themeChanged', customListener);
  
  return () => {
    window.removeEventListener('storage', storageListener);
    window.removeEventListener('themeChanged', customListener);
  };
};

/**
 * Force sync theme state with localStorage (useful for debugging)
 */
export const syncTheme = () => {
  const userPrefersDark = localStorage.getItem('prefersDarkMode') === 'true';
  if (userPrefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
  return userPrefersDark;
};
