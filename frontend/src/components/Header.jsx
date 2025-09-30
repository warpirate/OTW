import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, User, ChevronDown, ShoppingCart, LogOut, Search, Wrench, Sparkles, Package } from 'lucide-react';
import AuthService from '../app/services/auth.service';
import { LandingPageService } from '../app/services/landing_page.service';
import BookingService from '../app/services/booking.service';
import { isDarkMode, addThemeListener, toggleTheme } from '../app/utils/themeUtils';
import { useCart } from '../app/contexts/CartContext';
import Logo from './Logo';

const Header = () => {
  const navigate = useNavigate();
  const { getItemCount } = useCart();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ categories: [], subcategories: [] });
  
  // Check if we're on a customer page (Header is only used on customer pages)
  const isCustomerPage = () => {
    const path = window.location.pathname;
    return !path.startsWith('/admin') && !path.startsWith('/superadmin') && !path.startsWith('/worker');
  };

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

  // Update cart count and booking count
  useEffect(() => {
    const updateCounts = async () => {
      setCartItemCount(getItemCount());
      
      // Update booking count if authenticated
      if (isAuthenticated && user) {
        try {
          const response = await BookingService.bookings.getHistory({ limit: 1 });
          const activeBookings = (response.bookings || []).filter(booking =>
            ['pending', 'confirmed', 'in_progress'].includes(booking.status?.toLowerCase())
          );
          setBookingCount(activeBookings.length);
        } catch (error) {
          console.error('Error loading booking count:', error);
        }
      } else {
        setBookingCount(0);
      }
    };
    
    // Update initially
    updateCounts();
    
    // Set up interval to check counts
    const countCheckInterval = setInterval(updateCounts, 5000);
    
    // Listen for login event to update counts immediately
    const handleLogin = () => {
      updateCounts();
    };
    
    window.addEventListener('customer_login', handleLogin);
    
    return () => {
      clearInterval(countCheckInterval);
      window.removeEventListener('customer_login', handleLogin);
    };
  }, [getItemCount, isAuthenticated, user]);

  // Realtime search effect with debounce
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults({ categories: [], subcategories: [] });
        return;
      }

      try {
        const results = await LandingPageService.searchServices(searchQuery.trim());
        setSearchResults(results || { categories: [], subcategories: [] });
      } catch (err) {
        console.error('Header search error:', err);
        setSearchResults({ categories: [], subcategories: [] });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSuggestionClick = (item, type) => {
    setSearchQuery('');
    setSearchResults({ categories: [], subcategories: [] });

    if (type === 'category') {
      navigate(`/category/${item.id}/${item.name}`);
    } else if (type === 'subcategory') {
      navigate(`/category/${item.category_id}/${item.category_name}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchResults({ categories: [], subcategories: [] });
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e);
    }
  };

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
    
    setCartItemCount(0);
    
    setIsAuthenticated(false);
    setUser(null);
    setShowProfileDropdown(false);
  
  navigate('/');
};

return (
  <header className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'} shadow-sm border-b transition-colors sticky top-0 z-50`}>
    <div className="container-custom">
      <div className="flex justify-between items-center h-20 sm:h-24">
        <div className="flex items-center">
          <div className="flex-shrink-0">
              <button
                className="flex items-center cursor-pointer focus:outline-none"
                onClick={() => navigate('/')}
                aria-label="OMW Home"
              >
                <Logo responsive alt="OMW logo" className="h-14 sm:h-16 md:h-20 lg:h-24 xl:h-24 transition-opacity hover:opacity-90" />
              </button>
            </div>

            {/* Search Bar (visible on wider screens) */}
            <div className="hidden md:block ml-6 relative w-80 lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6" />
              {/* Search form */}
              <form onSubmit={handleSearchSubmit} className="w-full">
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className={`pl-11 pr-4 py-3 rounded-lg text-sm w-full border focus:outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'}`}
                />
              </form>

              {(searchResults.categories.length > 0 || searchResults.subcategories.length > 0) && searchQuery.trim().length > 0 && (
                <div className={`absolute left-0 right-0 mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto z-50 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  {/* Categories */}
                  {searchResults.categories.map((cat) => (
                    <div
                      key={`header-cat-${cat.id}`}
                      onClick={() => handleSuggestionClick(cat, 'category')}
                      className={`px-4 py-2 cursor-pointer flex items-center ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100'}`}
                    >
                      <Wrench className="h-4 w-4 text-brand mr-2" />
                      <span>{cat.name}</span>
                      <span className="ml-auto text-xs text-gray-500">Category</span>
                    </div>
                  ))}
                  {/* Subcategories */}
                  {searchResults.subcategories.map((sub) => (
                    <div
                      key={`header-sub-${sub.id}`}
                      onClick={() => handleSuggestionClick(sub, 'subcategory')}
                      className={`px-4 py-2 cursor-pointer flex items-center ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100'}`}
                    >
                      <Sparkles className="h-4 w-4 text-brand mr-2" />
                      <div className="flex flex-col">
                        <span>{sub.name}</span>
                        <span className="text-xs text-gray-500">{sub.category_name}</span>
                      </div>
                      <span className="ml-auto text-xs text-gray-500">Subcategory</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Cart Icon */}
            <button 
              onClick={() => navigate('/cart')}
              className={`relative p-2 sm:p-3 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
            
            {/* Dark Mode Toggle - Only show on customer pages */}
            {isCustomerPage() && (
              <button 
                onClick={() => {
                  const newDarkMode = toggleTheme();
                  setDarkMode(newDarkMode);
                }}
                className={`hidden sm:inline-flex p-3 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
              </button>
            )}
            
            {(isAuthenticated && user) ? (
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium hidden sm:inline">
                    {user.firstName || user.first_name || (user.name ? user.name.split(' ')[0] : 'User')}
                  </span>
                  <User className="h-6 w-6" />
                  <ChevronDown className={`h-5 w-5 transition-transform hidden sm:inline ${
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
                      
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          navigate('/bookings');
                        }}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-left transition-colors ${
                          darkMode
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Package className="h-4 w-4" />
                        <span>My Bookings</span>
                        {bookingCount > 0 && (
                          <span className="ml-1 bg-orange-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {bookingCount}
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
                {/* Always-visible: compact login icon (all sizes) */}
                <button
                  onClick={() => navigate('/login')}
                  aria-label="Sign In"
                  className={`inline-flex p-2.5 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <User className="h-6 w-6" />
                </button>

                {/* Medium and up: full text buttons */}
                <div className="hidden md:flex items-center space-x-2">
                  <button 
                    onClick={() => navigate('/login')} 
                    className={`btn-ghost ${darkMode ? 'text-white hover:bg-gray-800' : ''}`}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => navigate('/signup')} 
                    className="btn-brand"
                  >
                    Sign Up
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Mobile Search Bar */}
        <div className="md:hidden mt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-8 w-8" />
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className={`pl-12 pr-6 py-4 rounded-lg text-base w-full border focus:outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'}`}
              />
            </form>
            {(searchResults.categories.length > 0 || searchResults.subcategories.length > 0) && searchQuery.trim().length > 0 && (
              <div className={`absolute left-0 right-0 mt-2 rounded-md shadow-lg max-h-60 overflow-y-auto z-50 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                {searchResults.categories.map((cat) => (
                  <div
                    key={`mobile-header-cat-${cat.id}`}
                    className={`px-4 py-2 cursor-pointer flex items-center ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100'}`}
                  >
                    <Wrench className="h-4 w-4 text-brand mr-2" />
                    <span>{cat.name}</span>
                    <span className="ml-auto text-xs text-gray-500">Category</span>
                  </div>
                ))}
                {searchResults.subcategories.map((sub) => (
                  <div
                    key={`mobile-header-sub-${sub.id}`}
                    onClick={() => handleSuggestionClick(sub, 'subcategory')}
                    className={`px-4 py-2 cursor-pointer flex items-center ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100'}`}
                  >
                    <Sparkles className="h-4 w-4 text-brand mr-2" />
                    <div className="flex flex-col">
                      <span>{sub.name}</span>
                      <span className="text-xs text-gray-500">{sub.category_name}</span>
                    </div>
                    <span className="ml-auto text-xs text-gray-500">Subcategory</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;