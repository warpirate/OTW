import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, User, ChevronDown, ShoppingCart, LogOut } from 'lucide-react';
import AuthService from '../app/services/auth.service';
import { isDarkMode, addThemeListener, toggleTheme } from '../app/utils/themeUtils';
import { useCart } from '../app/contexts/CartContext';

const Header = () => {
  const navigate = useNavigate();
  const { getItemCount } = useCart();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Listen for theme changes
  useEffect(() => {
    // Set initial dark mode
    setDarkMode(isDarkMode());
    
    // Add listener for theme changes
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  // Update cart count
  useEffect(() => {
    const updateCartCount = () => {
      setCartItemCount(getItemCount());
    };
    
    // Update initially
    updateCartCount();
    
    // Set up interval to check cart count
    const cartCheckInterval = setInterval(updateCartCount, 1000);
    
    return () => {
      clearInterval(cartCheckInterval);
    };
  }, [getItemCount]);

  // Check for user authentication status
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        // Specifically check for customer role authentication
        if (AuthService.isLoggedIn('customer')) {
          const userData = AuthService.getCurrentUser('customer');
          if (userData) {
            setIsAuthenticated(true);
            setUser(userData);
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else if (isAuthenticated) {
          // If no customer authentication but state says authenticated, reset state
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    
    // Run authentication check when component mounts
    checkAuthStatus();
    
    // Set up interval to check auth status every 5 seconds (less frequent)
    const authCheckInterval = setInterval(checkAuthStatus, 5000);
    
    return () => {
      clearInterval(authCheckInterval);
    };
  }, [isAuthenticated]);

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Handle logout
  const handleLogout = () => {
    // Call logout function from imported AuthService with customer role
    AuthService.logout(navigate, 'customer');
    
    setIsAuthenticated(false);
    setUser(null);
    setShowProfileDropdown(false);
    
    navigate('/');
  };

  return (
    <header className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'} shadow-sm border-b transition-colors`}>
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div 
                className="flex items-center space-x-1 cursor-pointer" 
                onClick={() => navigate('/')}
              >
                <span className="text-2xl font-bold text-orange-500">O</span>
                <span className="text-2xl font-bold text-blue-500">T</span>
                <span className="text-2xl font-bold text-green-500">W</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Cart Icon */}
            <button 
              onClick={() => navigate('/cart')}
              className={`relative p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => {
                const newDarkMode = toggleTheme();
                setDarkMode(newDarkMode);
              }}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            {(isAuthenticated && user) ? (
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">
                    {user.firstName || user.first_name || (user.name ? user.name.split(' ')[0] : 'User')}
                  </span>
                  <User className="h-5 w-5" />
                  <ChevronDown className={`h-4 w-4 transition-transform ${
                    showProfileDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {showProfileDropdown && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          navigate('/profile');
                        }}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-left transition-colors ${
                          darkMode 
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span>View Profile</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          navigate('/cart');
                        }}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-left transition-colors ${
                          darkMode 
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>View Cart</span>
                        {cartItemCount > 0 && (
                          <span className="ml-1 bg-purple-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {cartItemCount}
                          </span>
                        )}
                      </button>
                      
                      <hr className={`my-1 ${
                        darkMode ? 'border-gray-700' : 'border-gray-200'
                      }`} />
                      
                      <button
                        onClick={handleLogout}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-left transition-colors ${
                          darkMode 
                            ? 'text-red-400 hover:bg-gray-700 hover:text-red-300' 
                            : 'text-red-600 hover:bg-gray-100'
                        }`}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Sign In/Sign Up buttons for non-authenticated users
              <>
                <button 
                  onClick={() => {
                    localStorage.setItem('prefersDarkMode', darkMode);
                    navigate('/login');
                  }} 
                  className={`btn-ghost ${darkMode ? 'text-white hover:bg-gray-800' : ''}`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('prefersDarkMode', darkMode);
                    navigate('/signup');
                  }} 
                  className="btn-brand"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 