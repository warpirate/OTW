import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Eye, EyeOff, ArrowLeft, CheckCircle, Briefcase, Star, MapPin, Navigation, AlertCircle } from 'lucide-react';
import AuthService from '../services/auth.service';
import WorkerService from '../services/worker.service';
import { LandingPageService } from '../services/landing_page.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';

const WorkerSignup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [signupMethod, setSignupMethod] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(isDarkMode());
  
  // Listen for theme changes
  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => setDarkMode(isDark));
    return cleanup;
  }, []);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
    // Provider table fields only
    experience: '',
    bio: '',
    serviceRadius: '10',
    latitude: null,
    longitude: null,
    permanentAddress: '',
    serviceType: '',
    categories: [],
    subcategories: [],
    // Emergency Contact Fields (as requested in requirements)
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    // Banking Details Fields (as requested in requirements)
    // bankName: '',
    // accountNumber: '',
    // ifscCode: '',
    // accountHolderName: '',
    // agreeToTerms: false
  });

  // Location states
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, requesting, granted, denied, error
  const [locationEditMode, setLocationEditMode] = useState('auto'); // 'auto' or 'manual'
  const [locationError, setLocationError] = useState('');
  
  // Service type, category and subcategory states
  const [serviceType, setServiceType] = useState(''); // 'maintenance', 'maid', or 'driver'
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (error) setError('');
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName) {
        setError('Please enter your full name');
        return false;
      }
      // Both email and phone should be mandatory (as per requirements)
      if (!formData.email) {
        setError('Please enter your email address');
        return false;
      }
      if (!formData.phone) {
        setError('Please enter your phone number');
        return false;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      // Emergency Contact validation (as per requirements)
      if (!formData.emergencyContactName) {
        setError('Please enter emergency contact name');
        return false;
      }
      if (!formData.emergencyContactRelationship) {
        setError('Please enter emergency contact relationship');
        return false;
      }
      if (!formData.emergencyContactPhone) {
        setError('Please enter emergency contact phone number');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.serviceType) {
        setError('Please select a service type');
        return false;
      }
      if (!formData.experience) {
        setError('Please select your experience level');
        return false;
      }
      if (formData.categories.length === 0) {
        setError('Please select at least one service category');
        return false;
      }
      if (formData.subcategories.length === 0) {
        setError('Please select at least one service subcategory');
        return false;
      }
      if (!formData.bio) {
        setError('Please write a brief bio');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.latitude || !formData.longitude) {
        setError('Please provide location access or enter coordinates manually');
        return false;
      }
      if (!formData.permanentAddress) {
        setError('Please enter your permanent address');
        return false;
      }
      if (!formData.agreeToTerms) {
        setError('Please agree to the terms and conditions');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      if (currentStep === 1) {
        // When moving to step 2, fetch categories
        console.log('Moving to step 2, fetching categories...');
        fetchCategories();
      }
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Service category types
  const SERVICE_TYPES = [
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'maid', name: 'Maid' },
    { id: 'driver', name: 'Driver' }
  ];
  
  // Handle service type change
  const handleServiceTypeChange = (e) => {
    const type = e.target.value;
    setServiceType(type);
    setFormData({
      ...formData,
      serviceType: type,
      categories: [],
      subcategories: []
    });
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    
    // Filter categories based on selected type
    if (type && categories.length > 0) {
      let filtered = [];
      if (type === 'maintenance') {
        filtered = categories.filter(cat => {
          const name = (cat.name || '').toLowerCase();
          return name.includes('repair') || 
                 name.includes('maintenance') ||
                 name.includes('installation') ||
                 name.includes('plumber') ||
                 name.includes('electrician') ||
                 name.includes('carpenter') ||
                 name.includes('pest') ||
                 name.includes('ac');
        });
      } else if (type === 'maid') {
        filtered = categories.filter(cat => {
          const name = (cat.name || '').toLowerCase();
          return name.includes('cleaning') || 
                 name.includes('housekeeping') ||
                 name.includes('maid') ||
                 name.includes('cleaner') ||
                 name.includes('cook');
        });
      } else if (type === 'driver') {
        filtered = categories.filter(cat => {
          const name = (cat.name || '').toLowerCase();
          return name.includes('transport') || 
                 name.includes('driver') ||
                 name.includes('delivery');
        });
      }
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories([]);
    }
  };

  // Fetch all categories from API
  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      setCategoryError('');
      console.log('Fetching categories...');
      const response = await LandingPageService.getAllCategories(1, 100);
      console.log('Raw API response:', response);
      
      if (response && response.category_data) {
        // Filter active categories
        const activeCategories = response.category_data.filter(cat => cat.is_active !== false);
        console.log('Active categories:', activeCategories);
        setCategories(activeCategories);
        
        // If service type already selected, filter categories
        if (serviceType) {
          console.log('Service type already selected, filtering categories...');
          let filtered = activeCategories.filter(cat => {
            const name = (cat.name || '').toLowerCase();
            if (serviceType === 'maintenance') {
              return name.includes('repair') || 
                     name.includes('maintenance') ||
                     name.includes('installation') ||
                     name.includes('plumber') ||
                     name.includes('electrician') ||
                     name.includes('carpenter') ||
                     name.includes('pest') ||
                     name.includes('ac');
            } else if (serviceType === 'maid') {
              return name.includes('cleaning') || 
                     name.includes('housekeeping') ||
                     name.includes('maid') ||
                     name.includes('cleaner') ||
                     name.includes('cook');
            } else if (serviceType === 'driver') {
              return name.includes('transport') || 
                     name.includes('driver') ||
                     name.includes('delivery');
            }
            return false;
          });
          setFilteredCategories(filtered);
        }
      } else {
        console.warn('No category data found in response');
        setCategoryError('Failed to load categories');
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategoryError('Failed to load categories');
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };
  
  // Fetch subcategories for a category
  const fetchSubcategoriesForCategory = async (categoryId) => {
    if (!categoryId) return;
    
    try {
      setIsLoadingSubcategories(true);
      const response = await LandingPageService.getAllSubCategories(categoryId);
      
      if (response) {
        // Add subcategories to the map
        setSubcategories(prevSubcategories => ({
          ...prevSubcategories,
          [categoryId]: response
        }));
        console.log(`Fetched subcategories for category ${categoryId}:`, response);
      }
    } catch (error) {
      console.error(`Error fetching subcategories for category ${categoryId}:`, error);
    } finally {
      setIsLoadingSubcategories(false);
    }
  };
  
  // Handle category selection (checkbox)
  const handleCategoryToggle = (category) => {
    console.log('Category toggle clicked:', category);
    const categoryId = category.id;
    let newSelectedCategories = [];
    
    if (selectedCategories.includes(categoryId)) {
      console.log('Removing category:', categoryId);
      // Remove category
      newSelectedCategories = selectedCategories.filter(id => id !== categoryId);
      
      // Remove any subcategories from this category
      const newSelectedSubcategories = selectedSubcategories.filter(item => 
        item.categoryId !== categoryId
      );
      setSelectedSubcategories(newSelectedSubcategories);
      
      // Update form data
      setFormData({
        ...formData,
        categories: newSelectedCategories,
        subcategories: newSelectedSubcategories.map(item => ({
          categoryId: item.categoryId,
          subcategoryId: item.subcategoryId
        }))
      });
    } else {
      console.log('Adding category:', categoryId);
      // Add category
      newSelectedCategories = [...selectedCategories, categoryId];
      
      // Update form data
      setFormData({
        ...formData,
        categories: newSelectedCategories
      });
      
      // Fetch subcategories if not already loaded
      if (!subcategories[categoryId]) {
        console.log('Fetching subcategories for category:', categoryId);
        fetchSubcategoriesForCategory(categoryId);
      } else {
        console.log('Subcategories already loaded for category:', categoryId);
      }
    }
    
    setSelectedCategories(newSelectedCategories);
    console.log('Updated selected categories:', newSelectedCategories);
  };

  // Handle subcategory selection (checkbox)
  const handleSubcategoryToggle = (categoryId, subcategoryId) => {
    const itemKey = `${categoryId}-${subcategoryId}`;
    const item = { categoryId, subcategoryId };
    let newSelectedSubcategories = [];
    
    // Check if this subcategory is already selected
    const isSelected = selectedSubcategories.some(
      sc => sc.categoryId === categoryId && sc.subcategoryId === subcategoryId
    );
    
    if (isSelected) {
      // Remove subcategory
      newSelectedSubcategories = selectedSubcategories.filter(
        sc => !(sc.categoryId === categoryId && sc.subcategoryId === subcategoryId)
      );
    } else {
      // Add subcategory
      newSelectedSubcategories = [...selectedSubcategories, item];
    }
    
    setSelectedSubcategories(newSelectedSubcategories);
    setFormData({
      ...formData,
      subcategories: newSelectedSubcategories
    });
  };

  const handleSendOtp = async () => {
    try {
      setIsLoading(true);
      await AuthService.requestOTP(formData.phone);
      setIsOtpSent(true);
      setError('');
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between auto and manual location modes
  // Auto mode attempts to use the browser's geolocation API
  // Manual mode allows the user to enter their location manually
  const toggleLocationMode = () => {
    const newMode = locationEditMode === 'auto' ? 'manual' : 'auto';
    setLocationEditMode(newMode);
    
    // Reset location error when switching modes
    setLocationError('');
    
    // If switching to auto mode, try to request location
    if (newMode === 'auto' && locationStatus === 'idle') {
      setTimeout(requestLocation, 500); // Small delay to allow UI update first
    }
  };
  
  // Handle manual address entry for geocoding
  const handleManualAddressEntry = async (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Only attempt geocoding if we have at least 10 characters (to avoid too many API calls)
    if (name === 'permanentAddress' && value.length > 10) {
      try {
        // Use browser's built-in geocoding API if available
        if (navigator.geolocation && window.fetch) {
          // For demonstration purposes, we'll use a free geocoding API
          // In production, this would be replaced with your preferred geocoding service
          console.log('Attempting to geocode address:', value);
          
          // Simulate geocoding by setting coordinates (in a real app, use an actual geocoding service)
          // For demo purposes only - normally you would make an API call here
          setTimeout(() => {
            // These would come from the geocoding service response
            const simulatedLat = 40.7128; // Example: New York coordinates
            const simulatedLng = -74.0060;
            
            setFormData(prev => ({
              ...prev,
              latitude: simulatedLat,
              longitude: simulatedLng
            }));
            
            console.log('Address geocoded, coordinates set:', simulatedLat, simulatedLng);
          }, 1000);
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
      }
    }
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationStatus('requesting');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        setLocationStatus('granted');
        setLocationError('');
        if (error && error.includes('location')) setError('');
      },
      (error) => {
        setLocationStatus('denied');
        setLocationError('Location access denied by user');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleManualLocationEntry = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || null;
    
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [name]: numValue
      };
      
      
      
      // Check if both coordinates are filled after this update
      if (updatedData.latitude && updatedData.longitude) {
        setLocationStatus('granted');
        setLocationError('');
      }
      
      return updatedData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setIsLoading(true);
    setError('');
    
    try {
      // Convert experience level to years
      const getExperienceYears = (level) => {
        switch (level) {
          case 'beginner': return 1;
          case 'intermediate': return 2;
          case 'experienced': return 4;
          case 'expert': return 6;
          default: return 0;
        }
      };
      
      // Prepare the data for API submission - including new required fields
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email, // Both email and phone are mandatory now
        phone: formData.phone, // Both email and phone are mandatory now
        password: formData.password,
        role: 'worker',
        signupMethod: 'both', // Since both email and phone are provided
        // Emergency Contact Data (as per requirements)
        emergencyContactName: formData.emergencyContactName,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        emergencyContactPhone: formData.emergencyContactPhone,
        // Provider specific data (only fields in providers table)
        providerData: {
          experience_years: getExperienceYears(formData.experience),
          bio: formData.bio,
          service_radius_km: parseInt(formData.serviceRadius || '10'),
          location_lat: formData.latitude,
          location_lng: formData.longitude,
          permanent_address: formData.permanentAddress,
          verified: false,
          active: true,
          rating: 0.0 // Default rating
        }
      };
      
      console.log('Submitting registration data:', userData);
      
      // Call registration API
      const response = await WorkerService.registerWorker(userData);
      
      if (response && response.user && response.token) {
        // Ensure the user has a role property set to 'worker'
        const user = { ...response.user, role: 'worker' };
        
        // Use AuthService to store tokens with proper role
        AuthService._storeTokens(response.token, user);
        
        // Add event to trigger storage listeners
        window.dispatchEvent(new Event('storage'));
        
        // Add a slight delay to ensure tokens are stored before navigation
        setTimeout(() => {
          navigate('/worker/dashboard', { replace: true });
        }, 100);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Last Name"
                />
              </div>
            </div>

            {/* Both email and phone are mandatory as per requirements */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Confirm Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Emergency Contact Section (as per requirements) */}
            <div className={`border-t pt-6 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Emergency Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Next of Kin Name *
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter emergency contact name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Relationship *
                    </label>
                    <select
                      name="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select relationship</option>
                      <option value="parent">Parent</option>
                      <option value="spouse">Spouse</option>
                      <option value="sibling">Sibling</option>
                      <option value="child">Child</option>
                      <option value="friend">Friend</option>
                      <option value="relative">Relative</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter contact number"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Service Type Selection */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Service Type
              </label>
              <div className={`flex rounded-lg p-1 mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {SERVICE_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleServiceTypeChange({ target: { value: type.id } })}
                    className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      serviceType === type.id
                        ? darkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                        : darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Experience Level
              </label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Select experience level</option>
                <option value="beginner">Beginner (0-1 years)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="experienced">Experienced (3-5 years)</option>
                <option value="expert">Expert (5+ years)</option>
              </select>
            </div>

            {/* Category Selection */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Service Categories (select all that apply)
              </label>
              {isLoadingCategories ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading categories...</span>
                </div>
              ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${serviceType ? '' : 'opacity-50'}`}>
                  {serviceType ? (
                    filteredCategories.length > 0 ? (
                      filteredCategories.map(category => (
                        <div 
                          key={category.id} 
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedCategories.includes(category.id)
                              ? darkMode ? 'bg-blue-800 border-blue-700' : 'bg-blue-50 border-blue-200'
                              : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200'
                          } border`}
                          onClick={() => handleCategoryToggle(category)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => {}} // Handled by div click
                            className="h-4 w-4 mr-3"
                          />
                          <span className={darkMode ? 'text-white' : 'text-gray-800'}>
                            {category.name || 'Unnamed Category'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className={`col-span-2 text-center py-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        No categories found for {serviceType}. Please select another service type.
                      </p>
                    )
                  ) : (
                    <p className={`col-span-2 text-center py-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Please select a service type first
                    </p>
                  )}
                </div>
              )}
              {categoryError && (
                <p className="mt-1 text-sm text-red-500">{categoryError}</p>
              )}
            </div>

            {/* Subcategory Selection */}
            {selectedCategories.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Service Subcategories (select all that apply)
                </label>
                <div className="space-y-4">
                  {selectedCategories.map(categoryId => {
                    const category = categories.find(c => c.id === categoryId);
                    return (
                      <div key={categoryId} className="border rounded-lg p-3">
                        <div className="font-medium mb-2">{category ? category.name : categoryId}</div>
                        {isLoadingSubcategories && !subcategories[categoryId] ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading...</span>
                          </div>
                        ) : subcategories[categoryId] && subcategories[categoryId].length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {subcategories[categoryId].map(subcategory => {
                              const isSelected = selectedSubcategories.some(
                                sc => sc.categoryId === categoryId && sc.subcategoryId === subcategory.id
                              );
                              return (
                                <div 
                                  key={subcategory.id} 
                                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-200'
                                      : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'
                                  } border`}
                                  onClick={() => handleSubcategoryToggle(categoryId, subcategory.id)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // Handled by div click
                                    className="h-4 w-4 mr-3"
                                  />
                                  <span className={darkMode ? 'text-white' : 'text-gray-800'}>
                                    {subcategory.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-amber-500">
                            No subcategories found for this category
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Bio
              </label>
              <textarea
                name="bio"
                rows="4"
                value={formData.bio}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Tell customers about yourself, your experience, and what makes you special..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Service Radius (km)
              </label>
              <select
                name="serviceRadius"
                value={formData.serviceRadius}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Location Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Location Access
                </h3>
                <button
                  type="button"
                  onClick={toggleLocationMode}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    darkMode 
                      ? 'bg-gray-700 text-white hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {locationEditMode === 'auto' ? 'Enter Manually' : 'Auto Detect'}
                </button>
              </div>
              
              {/* Auto Location Detection Mode */}
              {locationEditMode === 'auto' && (
                <>
                  {locationStatus === 'idle' && (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'
                    }`}>
                      <MapPin className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <Navigation className="w-4 h-4 inline mr-2" />
                        Allow Location Access
                      </button>
                    </div>
                  )}
                  
                  {locationStatus === 'requesting' && (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      darkMode ? 'border-blue-600 bg-blue-900/20' : 'border-blue-300 bg-blue-50'
                    }`}>
                      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className={darkMode ? 'text-blue-300' : 'text-blue-600'}>
                        Requesting location access...
                      </p>
                    </div>
                  )}
                  
                  {locationStatus === 'denied' && (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      darkMode ? 'border-red-600 bg-red-900/20' : 'border-red-300 bg-red-50'
                    }`}>
                      <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${
                        darkMode ? 'text-red-400' : 'text-red-500'
                      }`} />
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        Try Again
                      </button>
                      <p className={`text-sm mt-2 ${
                        darkMode ? 'text-red-300' : 'text-red-600'
                      }`}>
                        Location access denied by user
                      </p>
                    </div>
                  )}
                  
                  {locationStatus === 'granted' && (
                    <div className={`border-2 rounded-lg p-4 ${
                      darkMode ? 'border-green-600 bg-green-900/20' : 'border-green-300 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircle className={`w-5 h-5 mr-2 ${
                            darkMode ? 'text-green-400' : 'text-green-600'
                          }`} />
                          <span className={`text-sm font-medium ${
                            darkMode ? 'text-green-300' : 'text-green-600'
                          }`}>
                            Location access granted
                          </span>
                        </div>
                      </div>
                      {formData.latitude && formData.longitude && (
                        <div className={`text-xs mt-1 ${
                          darkMode ? 'text-green-200' : 'text-green-700'
                        }`}>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {/* Manual Entry Mode */}
              {locationEditMode === 'manual' && (
                <div className="space-y-4">
                  <div className={`border-2 rounded-lg p-4 ${
                    darkMode ? 'border-blue-600 bg-blue-900/10' : 'border-blue-300 bg-blue-50'
                  }`}>
                    <p className={`text-sm ${
                      darkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      Enter your permanent address below. The system will calculate your coordinates automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Permanent Address - Always shown but with different instructions based on mode */}
            <div className="mt-4">
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Permanent Address
              </label>
              <textarea
                name="permanentAddress"
                value={formData.permanentAddress || ''}
                onChange={locationEditMode === 'manual' ? handleManualAddressEntry : handleInputChange}
                required
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder={locationEditMode === 'manual' ? "Enter your full address (will be geocoded)" : "Enter your permanent address"}
                rows="3"
              />
            </div>

            {/* Banking Details Section (as per requirements)
            <div className={`border-t pt-6 mt-6 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Banking Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter bank name (e.g., State Bank of India)"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter account holder name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Account Number *
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter IFSC code (e.g., SBIN0123456)"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    💡 <strong>Note:</strong> This information is required for payment processing. Your banking details are securely encrypted and stored.
                  </p>
                </div>
              </div>
            </div> */}

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                required
                className="mr-2"
              />
              <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                I agree to the{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-800">
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-600 to-purple-700'} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Become a Worker</h1>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of professionals earning with OTW
            </p>
            
            {/* Steps indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      currentStep >= step ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
                    }`}>
                      {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                    </div>
                    <span className="text-sm text-center px-2">
                      {step === 1 && 'Personal Info'}
                      {step === 2 && 'Professional Info'}
                      {step === 3 && 'Location & Terms'}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Connection lines */}
              <div className="flex items-center justify-between mt-4 -mb-4">
                <div className="flex-1 flex items-center">
                  <div className={`flex-1 h-1 ${currentStep > 1 ? 'bg-white' : 'bg-white/30'}`}></div>
                </div>
                <div className="w-8"></div>
                <div className="flex-1 flex items-center">
                  <div className={`flex-1 h-1 ${currentStep > 2 ? 'bg-white' : 'bg-white/30'}`}></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Briefcase className="w-6 h-6" />
                <span>Set your own rates and schedule</span>
              </div>
              <div className="flex items-center space-x-3">
                <Star className="w-6 h-6" />
                <span>Build your reputation with ratings</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-6 h-6" />
                <span>Work in your local area</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className={`w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-12 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="mb-8">

            
            <div className="text-center">
              <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Worker Registration
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Step {currentStep} of 3
              </p>
            </div>
          </div>

          {/* Note: Both email and phone are now mandatory (as per requirements) */}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {renderStepContent()}
            
            <div className="mt-8 flex justify-between">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-white hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Previous
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="ml-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="ml-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              )}
            </div>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Already have a worker account?{' '}
              <Link
                to="/worker/login"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerSignup;
