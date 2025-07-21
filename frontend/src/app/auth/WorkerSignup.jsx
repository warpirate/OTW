import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Eye, EyeOff, ArrowLeft, CheckCircle, Briefcase, Star, MapPin, Navigation, AlertCircle } from 'lucide-react';
import AuthService from '../services/auth.service';
import WorkerService from '../services/worker.service';
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
    agreeToTerms: false
  });

  // Location states
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, requesting, granted, denied, error
  const [locationError, setLocationError] = useState('');
  


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
      if (signupMethod === 'email' && !formData.email) {
        setError('Please enter your email');
        return false;
      }
      if (signupMethod === 'phone' && !formData.phone) {
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
    } else if (currentStep === 2) {
      if (!formData.experience) {
        setError('Please select your experience level');
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
      setCurrentStep(currentStep + 1);
    }
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

  // Location functions
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
    
    
    
    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'worker',
        signupMethod,
        // Provider specific data (only fields in providers table)
        providerData: {
          experience_years: getExperienceYears(formData.experience),
          bio: formData.bio,
          service_radius_km: parseInt(formData.serviceRadius),
          location_lat: formData.latitude,
          location_lng: formData.longitude,
          verified: false,
          active: true,
          rating: 0.0 // Default rating
        }
      };
      
      
      
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
      setError(error.response?.data?.message || 'Signup failed. Please try again.');
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

            {signupMethod === 'email' ? (
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Email Address
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
                  placeholder="Enter your email"
                />
              </div>
            ) : (
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Phone Number
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
            )}

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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
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
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Location Access
              </h3>
              
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
                  <div className="flex items-center mb-2">
                    <CheckCircle className={`w-5 h-5 mr-2 ${
                      darkMode ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span className={`text-sm font-medium ${
                      darkMode ? 'text-green-300' : 'text-green-600'
                    }`}>
                      Location access granted
                    </span>
                  </div>
                  {formData.latitude && formData.longitude && (
                    <div className={`text-xs ${
                      darkMode ? 'text-green-200' : 'text-green-700'
                    }`}>
                      Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {locationStatus !== 'granted' && (
              <div className="text-center">
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                  or enter manually
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Latitude
                    </label>
                    <input
                      type="number"
                      name="latitude"
                      value={formData.latitude || ''}
                      onChange={handleManualLocationEntry}
                      step="any"
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter latitude"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      name="longitude"
                      value={formData.longitude || ''}
                      onChange={handleManualLocationEntry}
                      step="any"
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter longitude"
                    />
                  </div>
                </div>
              </div>
            )}



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
            <button
              onClick={() => navigate('/')}
              className={`mb-6 flex items-center space-x-2 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
            
            <div className="text-center">
              <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Worker Registration
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Step {currentStep} of 3
              </p>
            </div>
          </div>

          {/* Signup Method Toggle - Only on step 1 */}
          {currentStep === 1 && (
            <div className="mb-6">
              <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <button
                  type="button"
                  onClick={() => setSignupMethod('email')}
                  className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    signupMethod === 'email'
                      ? darkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                      : darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setSignupMethod('phone')}
                  className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    signupMethod === 'phone'
                      ? darkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'
                      : darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Phone
                </button>
              </div>
            </div>
          )}

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
