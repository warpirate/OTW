import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import {LandingPageService} from '../services/landing_page.service';
import AuthService from '../services/auth.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Logo from '../../components/Logo';
import { 
  Search, 
  MapPin, 
  Clock, 
  Home, 
  Wrench, 
  Zap, 
  Scissors, 
  Paintbrush, 
  Car, 
  Bike, 
  Shield, 
  CreditCard, 
  Users, 
  Smartphone, 
  Phone, 
  Star,
  ChevronRight,
  Mail,
  Moon,
  Sun,
  Hammer,
  Wind,
  Droplets,
  Bug,
  Sparkles,
  ChefHat,
  UserCheck,
  Calendar,
  User,
  ShoppingCart,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { getTypeImageSrc, getCategoryImageSrc, getServiceImageSrc } from '../utils/infographicMap';
import InfographicIcon from '../../components/InfographicIcon';

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('maintenance');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(isDarkMode());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dynamicServiceCategories, setDynamicServiceCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Realtime search results
  const [searchResults, setSearchResults] = useState({ categories: [], subcategories: [] });
  
  // Dynamic placeholder states
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState('Are you looking for services?');
  const [dynamicExploreText, setDynamicExploreText] = useState('Explore our services');
  const [currentServiceName, setCurrentServiceName] = useState('');

  // Fetch all subcategories for dynamic placeholder
  useEffect(() => {
    const fetchAllSubcategories = async () => {
      try {
        const allSubs = [];
        // Fetch subcategories from all available categories
        for (const category of categories) {
          try {
            const subCategoriesResponse = await LandingPageService.getAllSubCategories(category.id);
            if (subCategoriesResponse && subCategoriesResponse.length > 0) {
              allSubs.push(...subCategoriesResponse);
            }
          } catch (err) {
            console.error(`Error fetching subcategories for category ${category.id}:`, err);
          }
        }
        setAllSubcategories(allSubs);
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    };

    if (categories.length > 0) {
      fetchAllSubcategories();
    }
  }, [categories]);

  // Dynamic placeholder cycling effect
  useEffect(() => {
    if (allSubcategories.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % allSubcategories.length;
        const currentSub = allSubcategories[nextIndex];
        
        // Update both placeholder and explore text
        // Use full service name since we have responsive design
        const serviceName = currentSub.name;
        
        setCurrentServiceName(serviceName);
        setDynamicPlaceholder(`Search for ${serviceName}`);
        setDynamicExploreText(`Try ${serviceName}`);
        
        return nextIndex;
      });
    }, 2500); // Change every 2.5 seconds

    return () => clearInterval(interval);
  }, [allSubcategories]);

  // Debounce search query changes and fetch results
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
        console.error('Search error:', err);
        setSearchResults({ categories: [], subcategories: [] });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle suggestion click
  const handleSuggestionClick = (item, type) => {
    setSearchQuery('');
    setSearchResults({ categories: [], subcategories: [] });

    if (type === 'category') {
      navigate(`/category/${item.id}/${item.name}`);
    } else if (type === 'subcategory') {
      navigate(`/category/${item.category_id}/${item.category_name}`);
    }
  };
  
  // User authentication and profile dropdown states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Features array for Why Choose Section
  const features = [
    {
      title: "Verified Professionals",
      icon: Shield,
      description: "All service providers are thoroughly vetted and background-checked",
      bgColor: darkMode ? "bg-blue-900/30" : "bg-blue-100",
      iconColor: "text-blue-500"
    },
    {
      title: "Secure Payments",
      icon: CreditCard,
      description: "Your transactions are protected with bank-grade security",
      bgColor: darkMode ? "bg-green-900/30" : "bg-green-100",
      iconColor: "text-green-500"
    },
    {
      title: "Customer Support",
      icon: Phone,
      description: "Our team is available 24/7 to assist with any issues",
      bgColor: darkMode ? "bg-orange-900/30" : "bg-orange-100",
      iconColor: "text-orange-500"
    },
    {
      title: "Satisfaction Guarantee",
      icon: Star,
      description: "Not satisfied? We'll make it right or refund your payment",
      bgColor: darkMode ? "bg-purple-900/30" : "bg-purple-100",
      iconColor: "text-purple-500"
    }
  ];
  
  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Get all categories (no pagination for landing page)
        const response = await LandingPageService.getAllCategories(1, 100); 
        if (response && response.category_data) {
          // Filter active categories (if is_active field exists, otherwise include all)
          const activeCategories = response.category_data.filter(cat => cat.is_active !== false);
          
          // Store the full categories data for later use
          setCategories(activeCategories);
          
          // Group categories by type for display
          const groupedCategories = {};
          
          activeCategories.forEach(category => {
            const type = category.category_type || 'maintenance'; // Default to maintenance if no category_type
            
            if (!groupedCategories[type]) {
              groupedCategories[type] = {
                id: type,
                name: type.charAt(0).toUpperCase() + type.slice(1),
                categories: []
              };
            }
            
            // Get appropriate icon based on category type
            let icon;
            switch (type) {
              case 'maintenance':
                icon = Wrench;
                break;
              case 'maid':
                icon = Sparkles;
                break;
              case 'driver':
                icon = Car;
                break;
              default:
                icon = Wrench;
            }
            
            // Add the category to the respective group
            groupedCategories[type].categories.push({
              id: category.id,
              name: category.name,
              icon: icon,
              description: category.description || `Professional ${category.name} services`,
              imageUrl: category.image_url,
            });
          });
          
          
          
          setDynamicServiceCategories(groupedCategories);
          
          // Set active tab from navigation state if available, else first available
          if (Object.keys(groupedCategories).length > 0) {
            const stateTab = location.state?.activeTab;
            const initialTab = stateTab && groupedCategories[stateTab] ? stateTab : Object.keys(groupedCategories)[0];
            setActiveTab(initialTab);
          }
          
          
          
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load categories');
        // Fallback to default categories if API fails
        setDynamicServiceCategories(fallbackServiceCategories);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Respect activeTab passed via navigation state after categories are available
  useEffect(() => {
    const stateTab = location.state?.activeTab;
    if (stateTab && dynamicServiceCategories[stateTab]) {
      setActiveTab(stateTab);
    }
  }, [location.state, dynamicServiceCategories]);
  
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
  }, [isAuthenticated]); // Only depend on isAuthenticated to prevent unnecessary re-renders
  
  // Set up theme change listener
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

  // Handle scroll to services section when coming from cart
  useEffect(() => {
    if (location.state?.scrollToServices) {
      // Small delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        const servicesSection = document.querySelector('#our-services-section');
        if (servicesSection) {
          servicesSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);
  
  // Force authentication state update (for debugging)
  const forceAuthUpdate = () => {
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
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  };
  
  // Make forceAuthUpdate available globally for debugging
  window.forceAuthUpdate = forceAuthUpdate;
  
  // Handle logout
  const handleLogout = () => {
    // Call logout function from imported AuthService with customer role
    AuthService.logout(navigate, 'customer');
    
    setIsAuthenticated(false);
    setUser(null);
    setShowProfileDropdown(false);
    
    navigate('/');
  };
  
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
  



  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Use the Header component */}
      <Header />

      {/* Hero Section */}
      <section className="relative bg-brand-gradient-side py-20 md:py-32">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Left side with branding */}
            <div className="w-full md:w-1/2 text-white mb-10 md:mb-0 text-center md:text-left">
              <h1 className="heading-primary text-white mb-6">We are on the Way</h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-xl">
                We are on the way to make your life easier with our services.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <button className="btn-accent py-3 px-8 rounded-xl" onClick={() => navigate('/driver')}>
                  Book a Service
                </button>
              </div>
            </div>
            
            {/* Right side with search & quick access */}
            <div className="w-full md:w-5/12">
              <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 transition-colors`}>
                
                {/* Service Description */}
                <div className="mb-6 text-center">
                  <h3 className={`text-lg sm:text-xl font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Professional Services at Your Doorstep
                  </h3>
                </div>
                
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                    <input
                      type="text"
                      placeholder=""
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-search transition-all duration-500"
                    />
                    {/* Custom highlighted placeholder overlay */}
                    {!searchQuery && (
                      <div className="absolute left-12 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 transition-all duration-500">
                        <span className="text-sm sm:text-base">Search for </span>
                        <span className={`text-sm sm:text-base font-semibold ${darkMode ? 'text-brand-light' : 'text-brand'} transition-all duration-500`}>
                          {currentServiceName || 'Ac Services'}
                        </span>
                      </div>
                    )}
                    {/* Suggestions Dropdown */}
                    {(searchResults.categories.length > 0 || searchResults.subcategories.length > 0) && searchQuery.trim().length > 0 && (
                      <div className={`absolute z-10 left-0 right-0 mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {/* Categories */}
                        {searchResults.categories.map((cat) => (
                          <div
                            key={`cat-${cat.id}`}
                            onClick={() => handleSuggestionClick(cat, 'category')}
                            className={`px-4 py-2 cursor-pointer hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center`}
                          >
                            <Wrench className="h-4 w-4 text-brand mr-2" />
                            <span>{cat.name}</span>
                            <span className="ml-auto text-xs text-gray-500">Category</span>
                          </div>
                        ))}
                        {/* Subcategories */}
                        {searchResults.subcategories.map((sub) => (
                          <div
                            key={`sub-${sub.id}`}
                            onClick={() => handleSuggestionClick(sub, 'subcategory')}
                            className={`px-4 py-2 cursor-pointer hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center`}
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
                
                {/* Quick Service Categories */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Popular Categories</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {Object.values(dynamicServiceCategories).length > 0 ? 
                      Object.values(dynamicServiceCategories).map(category => (
                        <div 
                          key={category.id} 
                          onClick={() => {
                            if (category.id === 'driver') {
                              navigate('/driver');
                            } else {
                              // Set the active tab and scroll to Our Services section
                              setActiveTab(category.id);
                              // Scroll to the Our Services section
                              const servicesSection = document.querySelector('#our-services-section');
                              if (servicesSection) {
                                servicesSection.scrollIntoView({ 
                                  behavior: 'smooth',
                                  block: 'start'
                                });
                              }
                            }
                          }}
                          className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'} rounded-lg p-3 flex flex-col items-center text-center transition-all duration-200 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5`}
                        >
                          {/* icon tile */}
                          <InfographicIcon src={getTypeImageSrc(category.id)} alt={`${category.name} icon`} size="2xl" tone="brand" className="mb-2" />
                          <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{category.name}</span>
                        </div>
                      ))
                    : loading ? (
                      <div className="col-span-3 flex justify-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand"></div>
                      </div>
                    ) : (
                      <div className="col-span-3 text-center py-4">
                        <span className="text-sm text-gray-500">No categories available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories Section */}
      <section id="our-services-section" className={`py-16 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
        <div className="container-custom">
          {/* Section Title */}
          <div className="text-center mb-12">
            <h2 className={`heading-secondary mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Our Services</h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>Choose from our wide range of professional services</p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex justify-center mb-12">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-1 rounded-xl`}>
              {Object.values(dynamicServiceCategories).length > 0 ? (
                Object.values(dynamicServiceCategories).map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveTab(category.id);
                      setShowSubcategories(false);
                      setSelectedCategory(null);
                    }}
                    className={`px-8 py-3 rounded-lg font-medium transition-all ${
                      activeTab === category.id
                        ? `${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-primary-600'} shadow-md`
                        : `${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`
                    }`}
                  >
                    {category.name}
                  </button>
                ))
              ) : loading ? (
                <div className="px-8 py-3">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-brand"></div>
                </div>
              ) : (
                <button className="px-8 py-3 rounded-lg font-medium transition-all">
                  No Categories
                </button>
              )}
            </div>
          </div>

          {/* Services Grid */}
          {showSubcategories && selectedCategory ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => {
                    setShowSubcategories(false);
                    setSelectedCategory(null);
                  }}
                  className={`flex items-center ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-brand'}`}
                >
                  <ChevronRight className="h-5 w-5 mr-1 transform rotate-180" /> Back to Categories
                </button>
              </div>
              <h2 className={`text-3xl font-bold text-center mb-12 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedCategory.name}
              </h2>
              
              {loadingSubcategories ? (
                <div className="flex justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {subcategories && subcategories.length > 0 ? (
                    subcategories.map(subcategory => (
                                        <div 
                    key={subcategory.id}
                    className={`service-card ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <InfographicIcon src={getServiceImageSrc(subcategory)} alt={`${subcategory.name} icon`} size="3xl" tone="brand" />
                          </div>
                          <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{subcategory.name}</h3>
                          <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {subcategory.description || `Professional ${subcategory.name} services`}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold ${darkMode ? 'text-brand-light' : 'text-brand'}`}>{`₹${subcategory.base_price || 199}`}</span>
                            <button className={`btn-sm ${darkMode ? 'bg-brand-dark hover:bg-brand-darker' : ''}`}>Book</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-lg">No services available in {selectedCategory.name} category.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            Object.keys(dynamicServiceCategories).map(categoryKey => {
              const category = dynamicServiceCategories[categoryKey];
              return activeTab === categoryKey && (
                <div key={categoryKey}>
                  {categoryKey === 'driver' ? (
                    <div className="max-w-4xl mx-auto">
                      <h2 className={`text-3xl font-bold text-center mb-12 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Driver Services
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Service Overview Card */}
                        <div className="service-card">
                          <div className="flex flex-col items-center text-center p-8">
                            <div className={`mb-6 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-full p-4`}>
                              <Car className="h-12 w-12 text-brand" />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Professional Drivers
                            </h3>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mb-4 text-sm leading-relaxed`}>
                              Experienced and verified drivers for all your transportation needs
                            </p>
                            <div className="flex items-center space-x-2 text-sm">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="font-medium">4.8+ Rating</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Service Features Card */}
                        <div className="service-card">
                          <div className="flex flex-col items-center text-center p-8">
                            <div className={`mb-6 ${darkMode ? 'bg-gray-700' : 'bg-green-50'} rounded-full p-4`}>
                              <Shield className="h-12 w-12 text-brand" />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Safe & Reliable
                            </h3>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mb-4 text-sm leading-relaxed`}>
                              Background-verified drivers with comprehensive insurance coverage
                            </p>
                            <div className="flex items-center space-x-2 text-sm">
                              <Shield className="h-4 w-4 text-green-500" />
                              <span className="font-medium">100% Verified</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Call to Action */}
                      <div className="text-center mt-12">
                        <button 
                          onClick={() => navigate('/driver')}
                          className="bg-brand text-white hover:bg-brand-dark transition-colors duration-200 px-12 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                        >
                          Book Vehicle <ChevronRight className="inline-block h-5 w-5 ml-2" />
                        </button>
                        <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Choose your preferred vehicle type and booking duration
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className={`text-3xl font-bold text-center mb-12 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {dynamicServiceCategories[activeTab]?.name || 'Loading...'} Categories
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {loading ? (
                        <div className="col-span-3 flex justify-center py-16">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
                        </div>
                      ) : error ? (
                        <div className="col-span-3 text-center py-16">
                          <p className={`${darkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
                          <button 
                            onClick={() => window.location.reload()} 
                            className="mt-4 px-4 py-2 bg-brand text-white rounded-md"
                          >
                            Retry
                          </button>
                        </div>
                      ) : dynamicServiceCategories[activeTab]?.categories && dynamicServiceCategories[activeTab].categories.length > 0 ? (
                        <>
                          {dynamicServiceCategories[activeTab].categories.map((cat) => {
                            const IconComponent = cat.icon;
                            return (
                              <div
                                key={cat.id}
                                className={`group relative overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer`}
                                onClick={() => {
                                  window.scrollTo(0, 0);
                                  navigate(`/category/${cat.id}/${cat.name}`);
                                }}
                              >
                                {/* Decorative background glow for theme blending */}
                                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-brand opacity-20 blur-2xl" />

                                <div className="p-6 flex items-center gap-6 h-full">
                                  {/* Image Section - prominent with gradient container */}
                                  <div className="relative flex-shrink-0">
                                    <div className={`relative flex items-center justify-center rounded-2xl shadow-inner ring-1 ${darkMode ? 'ring-white/10' : 'ring-black/5'} bg-gradient-brand/20 w-28 h-28 md:w-36 md:h-36`}> 
                                      <InfographicIcon
                                        src={getCategoryImageSrc(cat.name, cat.imageUrl)}
                                        alt={`${cat.name} icon`}
                                        size="4xl"
                                        className="drop-shadow-xl transition-transform duration-300 ease-out group-hover:scale-110"
                                      />
                                    </div>
                                  </div>

                                  {/* Content Section */}
                                  <div className="flex-grow flex flex-col justify-center">
                                    <h3 className={`font-bold text-xl mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cat.name}</h3>
                                    <p className={`text-sm leading-relaxed mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{cat.description}</p>

                                    {/* Button Section */}
                                    <div className="mt-2">
                                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-md font-medium text-sm transition-colors duration-200 flex items-center gap-1">
                                        View Services
                                        <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <div className="col-span-4 text-center py-8">
                          <p className="text-lg">No categories available at the moment.</p>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }))
          }
        </div>
      </section>

      {/* Why Choose Section */}
      <section className={`py-16 transition-colors ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className={`heading-secondary mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Why Choose OMW?
            </h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} max-w-2xl mx-auto`}>
              From home maintenance and repairs to cleaning and specialized services, we connect you with verified professionals who deliver quality work with reliability and care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="card p-6 hover:translate-y-[-8px] transition-all duration-300">
                  <div className={`p-3 rounded-full w-fit mb-5 ${feature.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className={`heading-tertiary mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} text-sm`}>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-gradient text-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-lg mb-10 opacity-90">
              Download the OMW app and experience hassle-free services at your doorstep.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <button className="btn-accent py-4 px-8 rounded-xl flex items-center justify-center gap-3 text-lg" onClick={() => window.open('https://mockappstore.com/otw-app', '_blank')}>
                <Smartphone className="h-6 w-6" />
                Download App
              </button>
              <button className="btn-outline text-white border-white hover:bg-white/10 py-4 px-8 rounded-xl flex items-center justify-center gap-3 text-lg" onClick={() => window.open('tel:+1234567890')}>
                <Phone className="h-6 w-6" />
                Book via Call
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Use the Footer component */}
      <Footer />
    </div>
  );
};

export default LandingPage;
