import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {LandingPageService} from '../services/landing_page.service';
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

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('maintenance');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dynamicServiceCategories, setDynamicServiceCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  
  // Driver selection states
  const [driverStep, setDriverStep] = useState(1); // 1 for car selection, 2 for booking basis
  const [selectedCarOption, setSelectedCarOption] = useState(null); // 'with-car' or 'without-car'
  const [showDriverSteps, setShowDriverSteps] = useState(false);
  
  // User authentication and profile dropdown states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Get all categories (no pagination for landing page)
        const response = await LandingPageService.getAllCategories(1, 100);
        console.log(" response from landing page ", response);
        if (response && response.category_data) {
          // Filter active categories
          const activeCategories = response.category_data.filter(cat => cat.is_active);
          
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
              hasSubcategories: true // We'll assume all categories can have subcategories
            });
          });
          
          setDynamicServiceCategories(groupedCategories);
          
          // Set active tab to the first available category type
          if (Object.keys(groupedCategories).length > 0) {
            setActiveTab(Object.keys(groupedCategories)[0]);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
        // Fallback to default categories if API fails
        setDynamicServiceCategories(fallbackServiceCategories);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Check for user authentication status
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      } else {
        // For demo purposes, simulate a logged-in user
        // Remove this in production and rely on actual authentication
        const demoUser = {
          firstName: 'Varun',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        };
        setIsAuthenticated(true);
        setUser(demoUser);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
    setShowProfileDropdown(false);
    navigate('/login');
  };
  
  // Close dropdown when clicking outside
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
  
  // Fallback service categories in case API fails
  const fallbackServiceCategories = {
    maintenance: {
      id: 'maintenance',
      name: 'Maintenance',
      categories: [
        {
          id: 'carpenter',
          name: 'Carpenter',
          icon: Hammer,
          description: 'Furniture repair, woodwork, installations',
          hasSubcategories: true
        },
        {
          id: 'ac-services',
          name: 'AC Services',
          icon: Wind,
          description: 'AC repair, installation, maintenance',
          hasSubcategories: true
        },
        {
          id: 'plumber',
          name: 'Plumber',
          icon: Droplets,
          description: 'Pipe repair, bathroom fittings, leakage',
          hasSubcategories: true
        }
      ]
    },
    maid: {
      id: 'maid',
      name: 'Maid',
      categories: [
        {
          id: 'cleaner',
          name: 'Cleaner',
          icon: Sparkles,
          description: 'House cleaning, deep cleaning services',
          hasSubcategories: true
        }
      ]
    },
    driver: {
      id: 'driver',
      name: 'Driver',
      categories: [
        {
          id: 'with-car',
          name: 'With Car',
          icon: Car,
          description: 'Driver with car services',
          hasSubcategories: true
        }
      ]
    }
  };

  const rideOptions = [
    {
      id: 'sedan',
      name: 'Sedan',
      icon: Car,
      description: 'Comfortable rides for 4',
      price: '₹12/km',
      eta: '3-5 min',
      bgColor: 'bg-white',
      iconColor: 'text-brand'
    },
    {
      id: 'bike',
      name: 'Bike',
      icon: Bike,
      description: 'Quick & affordable',
      price: '₹8/km',
      eta: '2-4 min',
      bgColor: 'bg-white',
      iconColor: 'text-brand'
    }
  ];

  const features = [
    {
      icon: Shield,
      title: 'Verified Professionals',
      description: 'All service providers are background verified and trained',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      icon: CreditCard,
      title: 'Secure Payments',
      description: 'Multiple payment options with 100% secure transactions',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'Round-the-clock customer support for all your needs',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      icon: Users,
      title: 'Trusted by Millions',
      description: 'Join over 1M+ satisfied customers across Canada',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'} shadow-sm border-b transition-colors`}>
        <div className="container-custom">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-1">
                  <span className="text-2xl font-bold text-orange-500">O</span>
                  <span className="text-2xl font-bold text-blue-500">T</span>
                  <span className="text-2xl font-bold text-green-500">W</span>
                </div>
              </div>
            </div>
            
            {/* Hourly/Daily Services tabs commented out - not needed for now */}
            {/* <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <button 
                  onClick={() => setActiveTab('hourly')}
                  className={`${
                    activeTab === 'hourly' 
                      ? 'nav-tab-active' 
                      : 'nav-tab-inactive'
                  } ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Hourly Services
                </button>
                <button 
                  onClick={() => setActiveTab('daily')}
                  className={`${
                    activeTab === 'daily' 
                      ? 'nav-tab-active' 
                      : 'nav-tab-inactive'
                  } ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Daily Services
                </button>
              </div>
            </div> */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              {isAuthenticated && user ? (
                // Profile dropdown for authenticated users
                <div className="relative profile-dropdown">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'text-white hover:bg-gray-800' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-medium">{user.firstName}</span>
                    <User className="h-5 w-5" />
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      showProfileDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {showProfileDropdown && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                      isDarkMode 
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
                            isDarkMode 
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
                            isDarkMode 
                              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span>View Cart</span>
                        </button>
                        
                        <hr className={`my-1 ${
                          isDarkMode ? 'border-gray-700' : 'border-gray-200'
                        }`} />
                        
                        <button
                          onClick={handleLogout}
                          className={`flex items-center space-x-2 w-full px-4 py-2 text-left transition-colors ${
                            isDarkMode 
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
                      localStorage.setItem('prefersDarkMode', isDarkMode);
                      navigate('/login');
                    }} 
                    className={`btn-ghost ${isDarkMode ? 'text-white hover:bg-gray-800' : ''}`}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('prefersDarkMode', isDarkMode);
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
                <button className="btn-accent py-3 px-8 rounded-xl">
                  Book a Service
                </button>
              </div>
            </div>
            
            {/* Right side with search & quick access */}
            <div className="w-full md:w-5/12">
              <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-2xl shadow-xl p-6 md:p-8 transition-colors`}>
                <div className="flex items-center mb-2">
                  <div className="flex items-center space-x-1 mr-3">
                    <span className="text-3xl font-bold text-orange-500">O</span>
                    <span className="text-3xl font-bold text-blue-500">T</span>
                    <span className="text-3xl font-bold text-green-500">W</span>
                  </div>
                  <span className="text-yellow-400 text-2xl">👋</span>
                </div>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>Explore our services</p>
                
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Are you looking for services?"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-search"
                    />
                  </div>
                </div>
                
                {/* Quick Service Categories */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Popular Categories</h3>
                    <button onClick={() => setActiveTab('maintenance')} className="text-sm text-brand flex items-center hover:underline">
                      View all <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {Object.values(dynamicServiceCategories).length > 0 ? 
                      Object.values(dynamicServiceCategories).map(category => (
                        <div 
                          key={category.id} 
                          onClick={() => setActiveTab(category.id)}
                          className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg p-3 flex flex-col items-center text-center transition-all duration-200 cursor-pointer`}
                        >
                          <div className={`${isDarkMode ? 'bg-gray-600' : 'bg-white'} rounded-full p-2 mb-2`}>
                            {category.id === 'maintenance' && <Wrench className="h-6 w-6 text-brand" />}
                            {category.id === 'maid' && <Sparkles className="h-6 w-6 text-brand" />}
                            {category.id === 'driver' && <Car className="h-6 w-6 text-brand" />}
                          </div>
                          <span className="text-sm font-medium">{category.name}</span>
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
      <section className={`py-16 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
        <div className="container-custom">
          {/* Section Title */}
          <div className="text-center mb-12">
            <h2 className={`heading-secondary mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Our Services</h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>Choose from our wide range of professional services</p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex justify-center mb-12">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-1 rounded-xl`}>
              {Object.values(dynamicServiceCategories).length > 0 ? (
                Object.values(dynamicServiceCategories).map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveTab(category.id);
                      setShowSubcategories(false);
                      setSelectedCategory(null);
                      // Reset driver states
                      setShowDriverSteps(false);
                      setDriverStep(1);
                      setSelectedCarOption(null);
                    }}
                    className={`px-8 py-3 rounded-lg font-medium transition-all ${
                      activeTab === category.id
                        ? `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-primary-600'} shadow-md`
                        : `${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`
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
                  className={`flex items-center ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-brand'}`}
                >
                  <ChevronRight className="h-5 w-5 mr-1 transform rotate-180" /> Back to Categories
                </button>
              </div>
              <h2 className={`text-3xl font-bold text-center mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedCategory.name} Services
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
                        className={`service-card ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className={`rounded-full p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-brand-50'}`}>
                              {selectedCategory.icon && <selectedCategory.icon className="service-icon" />}
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="ml-1 text-sm font-medium">{(4 + Math.random()).toFixed(1)}</span>
                            </div>
                          </div>
                          <h3 className="font-bold text-lg mb-2">{subcategory.name}</h3>
                          <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {subcategory.description || `Professional ${subcategory.name} services`}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-brand">{`Starting ₹${subcategory.base_price || 199}`}</span>
                            <button className="btn-sm">Book</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-lg">{`No services available in ${selectedCategory.name} category.`}</p>
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
                      {showDriverSteps ? (
                        <div className="space-y-8">
                          <h2 className={`text-3xl font-bold text-center mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Driver Services
                          </h2>
                          
                          {/* Back button */}
                          <button 
                            onClick={() => {
                              setShowDriverSteps(false);
                              setDriverStep(1);
                              setSelectedCarOption(null);
                            }}
                            className={`flex items-center ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-brand'}`}
                          >
                            <ChevronRight className="h-5 w-5 mr-1 transform rotate-180" /> Back to Driver Options
                          </button>
                          
                          {/* Step indicator */}
                          <div className="flex justify-center mb-8">
                            <div className="flex items-center space-x-4">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                driverStep >= 1 ? 'bg-brand text-white' : (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
                              }`}>
                                1
                              </div>
                              <div className={`h-0.5 w-16 ${
                                driverStep >= 2 ? 'bg-brand' : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')
                              }`}></div>
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                driverStep >= 2 ? 'bg-brand text-white' : (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
                              }`}>
                                2
                              </div>
                            </div>
                          </div>
                          
                          {driverStep === 1 ? (
                            <div>
                              <h3 className={`text-2xl font-bold text-center mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Choose Driver Type
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* With Car Option */}
                                <div 
                                  onClick={() => {
                                    setSelectedCarOption('with-car');
                                    setDriverStep(2);
                                  }}
                                  className={`service-card hover:shadow-xl cursor-pointer transition-all ${
                                    isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-brand' : 'bg-white border-gray-100 hover:border-brand'
                                  }`}
                                >
                                  <div className="flex flex-col items-center text-center p-8">
                                    <div className={`mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-full p-4`}>
                                      <Car className="h-8 w-8 text-brand" />
                                    </div>
                                    <h4 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      With Car
                                    </h4>
                                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm leading-relaxed`}>
                                      Driver will provide their own vehicle
                                    </p>
                                    <button className="w-full btn-ghost border border-brand text-brand hover:bg-brand hover:text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
                                      Select <ChevronRight className="inline-block h-4 w-4 ml-1" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Without Car Option */}
                                <div 
                                  onClick={() => {
                                    setSelectedCarOption('without-car');
                                    setDriverStep(2);
                                  }}
                                  className={`service-card hover:shadow-xl cursor-pointer transition-all ${
                                    isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-brand' : 'bg-white border-gray-100 hover:border-brand'
                                  }`}
                                >
                                  <div className="flex flex-col items-center text-center p-8">
                                    <div className={`mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'} rounded-full p-4`}>
                                      <UserCheck className="h-8 w-8 text-brand" />
                                    </div>
                                    <h4 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      Without Car
                                    </h4>
                                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm leading-relaxed`}>
                                      Driver will use your vehicle
                                    </p>
                                    <button className="w-full btn-ghost border border-brand text-brand hover:bg-brand hover:text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
                                      Select <ChevronRight className="inline-block h-4 w-4 ml-1" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h3 className={`text-2xl font-bold text-center mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Choose Booking Basis
                              </h3>
                              <p className={`text-center mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Selected: {selectedCarOption === 'with-car' ? 'With Car' : 'Without Car'}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Per Hour Basis */}
                                <div 
                                  onClick={() => {
                                    // Handle per hour booking logic here
                                    console.log('Per hour booking selected with', selectedCarOption);
                                  }}
                                  className={`service-card hover:shadow-xl cursor-pointer transition-all ${
                                    isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-brand' : 'bg-white border-gray-100 hover:border-brand'
                                  }`}
                                >
                                  <div className="flex flex-col items-center text-center p-8">
                                    <div className={`mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-orange-50'} rounded-full p-4`}>
                                      <Clock className="h-8 w-8 text-brand" />
                                    </div>
                                    <h4 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      Per Hour Basis
                                    </h4>
                                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm leading-relaxed`}>
                                      Flexible hourly booking
                                    </p>
                                    <button className="w-full btn-ghost border border-brand text-brand hover:bg-brand hover:text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
                                      Book Now <ChevronRight className="inline-block h-4 w-4 ml-1" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Per Day Basis */}
                                <div 
                                  onClick={() => {
                                    // Handle per day booking logic here
                                    console.log('Per day booking selected with', selectedCarOption);
                                  }}
                                  className={`service-card hover:shadow-xl cursor-pointer transition-all ${
                                    isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-brand' : 'bg-white border-gray-100 hover:border-brand'
                                  }`}
                                >
                                  <div className="flex flex-col items-center text-center p-8">
                                    <div className={`mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-purple-50'} rounded-full p-4`}>
                                      <Calendar className="h-8 w-8 text-brand" />
                                    </div>
                                    <h4 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      Per Day Basis
                                    </h4>
                                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm leading-relaxed`}>
                                      Full day booking
                                    </p>
                                    <button className="w-full btn-ghost border border-brand text-brand hover:bg-brand hover:text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
                                      Book Now <ChevronRight className="inline-block h-4 w-4 ml-1" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Back to step 1 */}
                              <div className="text-center mt-8">
                                <button 
                                  onClick={() => {
                                    setDriverStep(1);
                                    setSelectedCarOption(null);
                                  }}
                                  className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-brand'}`}
                                >
                                  <ChevronRight className="h-4 w-4 mr-1 transform rotate-180 inline-block" /> Change Driver Type
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h2 className={`text-3xl font-bold text-center mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Driver Services
                          </h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {/* Service Overview Card */}
                            <div className={`service-card ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                              <div className="flex flex-col items-center text-center p-8">
                                <div className={`mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-full p-4`}>
                                  <Car className="h-12 w-12 text-brand" />
                                </div>
                                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  Professional Drivers
                                </h3>
                                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm leading-relaxed`}>
                                  Experienced and verified drivers for all your transportation needs
                                </p>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="font-medium">4.8+ Rating</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Service Features Card */}
                            <div className={`service-card ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                              <div className="flex flex-col items-center text-center p-8">
                                <div className={`mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'} rounded-full p-4`}>
                                  <Shield className="h-12 w-12 text-brand" />
                                </div>
                                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  Safe & Reliable
                                </h3>
                                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 text-sm leading-relaxed`}>
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
                              onClick={() => setShowDriverSteps(true)}
                              className="bg-brand text-white hover:bg-brand-dark transition-colors duration-200 px-12 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                            >
                              Book a Driver <ChevronRight className="inline-block h-5 w-5 ml-2" />
                            </button>
                            <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Choose your preferred driver type and booking duration
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h2 className={`text-3xl font-bold text-center mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {dynamicServiceCategories[activeTab]?.name || 'Loading...'} Categories
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {loading ? (
                        <div className="col-span-3 flex justify-center py-16">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
                        </div>
                      ) : error ? (
                        <div className="col-span-3 text-center py-16">
                          <p className={`${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
                          <button 
                            onClick={() => window.location.reload()} 
                            className="mt-4 px-4 py-2 bg-brand text-white rounded-md"
                          >
                            Retry
                          </button>
                        </div>
                      ) : category.categories && category.categories.length > 0 ? (
                        <>
                          {category.categories.map((cat) => {
                            const IconComponent = cat.icon;
                            return (
                              <div 
                                key={cat.id}
                                className={`service-card ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} cursor-pointer`}
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setLoadingSubcategories(true);
                                  setShowSubcategories(true);
                                  
                                  // Fetch subcategories for the selected category
                                  LandingPageService.getAllSubCategories(cat.id)
                                    .then(data => {
                                      setSubcategories(data || []);
                                      setLoadingSubcategories(false);
                                    })
                                    .catch(err => {
                                      console.error(`Error fetching subcategories for ${cat.name}:`, err);
                                      setSubcategories([]);
                                      setLoadingSubcategories(false);
                                    });
                                }}
                              >
                                <div className="p-6">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className={`rounded-full p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-brand-50'}`}>
                                      <IconComponent className="service-icon" />
                                    </div>
                                  </div>
                                  <h3 className="font-bold text-lg mb-2">{cat.name}</h3>
                                  <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{cat.description}</p>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-brand">View Services</span>
                                    <ChevronRight className="h-5 w-5 text-brand" />
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
      <section className={`py-16 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className={`heading-secondary mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Why Choose OTW?
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Experience the best in-home services with our trusted platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className={`card p-6 hover:translate-y-[-8px] transition-all duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className={`p-3 rounded-full w-fit mb-5 ${feature.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className={`heading-tertiary mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>{feature.description}</p>
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
              Download the OTW app and experience hassle-free services at your doorstep.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <button className="btn-accent py-4 px-8 rounded-xl flex items-center justify-center gap-3 text-lg">
                <Smartphone className="h-6 w-6" />
                Download App
              </button>
              <button className="btn-outline text-white border-white hover:bg-white/10 py-4 px-8 rounded-xl flex items-center justify-center gap-3 text-lg">
                <Phone className="h-6 w-6" />
                Book via Call
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center space-x-1 mb-6">
                <span className="text-2xl font-bold text-orange-500">O</span>
                <span className="text-2xl font-bold text-blue-500">T</span>
                <span className="text-2xl font-bold text-green-500">W</span>
              </div>
              <p className="text-gray-400 mb-8">
                Your trusted partner for professional home services.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="bg-gray-800 p-3 rounded-full hover:bg-primary-500 transition-all duration-200 transform hover:scale-110">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
                </a>
                <a href="#" className="bg-gray-800 p-3 rounded-full hover:bg-primary-500 transition-all duration-200 transform hover:scale-110">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                </a>
                <a href="#" className="bg-gray-800 p-3 rounded-full hover:bg-primary-500 transition-all duration-200 transform hover:scale-110">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63-.064-.902-.092-2.278.038-3.26.134-.986.9-6.302.9-6.302s-.23-.468-.23-1.148c0-1.076.624-1.88 1.402-1.88.66 0 .98.496.98 1.092 0 .665-.424 1.663-.646 2.588-.182.775.39 1.404 1.15 1.404 1.38 0 2.31-1.457 2.31-3.568 0-1.863-1.334-3.17-3.246-3.17-2.208 0-3.506 1.664-3.506 3.383 0 .67.23 1.388.516 1.78.058.07.082.13.07.2-.076.316-.246.996-.28 1.134-.044.183-.145.222-.335.134-1.25-.58-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.012 0-1.965-.525-2.29-1.148l-.623 2.378c-.226.87-.834 1.958-1.244 2.62 1.12.345 2.29.535 3.5.535 6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Services</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Maintenance</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Maid Services</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Driver Services</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Plumbing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">AC Services</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Contact</h3>
              <p className="text-gray-400 mb-4">
                123 Street, Toronto, ON, Canada
              </p>
              <p className="text-gray-400 mb-2 flex items-center">
                <Phone className="h-4 w-4 mr-2" /> +1 234-567-8900
              </p>
              <p className="text-gray-400 flex items-center">
                <Mail className="h-4 w-4 mr-2" /> contact@otw.ca
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} OTW. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
