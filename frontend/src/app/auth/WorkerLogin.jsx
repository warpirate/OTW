import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Phone, Mail, Briefcase } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';

const WorkerLogin = () => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    otp: ''
  });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user types
    if (error) setError('');
  };

  const handleSendOtp = async () => {
    try {
      setIsLoading(true);
      // Call the requestOTP method from AuthService
      await AuthService.requestOTP(formData.phone);
      setIsOtpSent(true);
      setError('');
      toast.success("OTP sent successfully!");
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let response;
      
      if (loginMethod === 'phone' && isOtpSent) {
        // OTP login with worker role
        response = await AuthService.loginWithOTP(formData.phone, formData.otp, 'worker');
      } else {
        // Email/password login
        const identifier = loginMethod === 'email' ? formData.email : formData.phone;
        response = await AuthService.login(identifier, formData.password, 'worker');
      }

      // Verify the user has worker role using the role-based authentication system
      const user = AuthService.getCurrentUser('worker');
      
      // Check for both 'worker' and 'Worker' to handle case sensitivity
      const userRole = user?.role?.toLowerCase();
      if (!user || (userRole !== 'worker' && userRole !== 'provider')) {
        throw new Error(`You do not have worker privileges. Current role: ${user?.role}`);
      }
      
      // Show success toast
      toast.success("Login successful!");
      
      // Navigate immediately with replace to prevent back navigation to login
      navigate('/worker/dashboard', { replace: true });
      
      // Also dispatch storage event for any listeners
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-600 to-purple-700'} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Join Our Worker Network</h1>
            <p className="text-xl text-purple-100 mb-6">
              Start earning with your skills and grow your business with OMW
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span>Flexible working hours</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">₹</span>
                </div>
                <span>Competitive earnings</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">📱</span>
                </div>
                <span>Easy-to-use mobile app</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className={`w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-12 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="mb-8">

            
            <div className="text-center">
              <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Worker Login
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Access your worker dashboard
              </p>
            </div>
          </div>

          {/* Login Method Toggle */}
          <div className="mb-6">
            <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('email');
                  setIsOtpSent(false);
                  setFormData({ ...formData, otp: '' });
                }}
                className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? darkMode 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-purple-600 shadow-sm'
                    : darkMode 
                      ? 'text-gray-300' 
                      : 'text-gray-500'
                }`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('phone');
                  setIsOtpSent(false);
                  setFormData({ ...formData, otp: '' });
                }}
                className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'phone'
                    ? darkMode 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-purple-600 shadow-sm'
                    : darkMode 
                      ? 'text-gray-300' 
                      : 'text-gray-500'
                }`}
              >
                <Phone className="w-4 h-4 mr-2" />
                Phone
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {loginMethod === 'email' ? (
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
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
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
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter your phone number"
                />
              </div>
            )}

            {loginMethod === 'phone' && !isOtpSent && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={!formData.phone || isLoading}
                className="w-full btn-brand disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            )}

            {loginMethod === 'phone' && isOtpSent && (
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Enter OTP
                </label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  required
                  maxLength="6"
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter 6-digit OTP"
                />
              </div>
            )}

            {(loginMethod === 'email' || (loginMethod === 'phone' && !isOtpSent)) && (
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
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter your password"
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
            )}

            <button
              type="submit"
              disabled={isLoading || (loginMethod === 'phone' && !isOtpSent && !formData.phone)}
              className="w-full btn-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4">
            <Link
              to="/worker/forgot-password"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Forgot your password?
            </Link>
            
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Don't have a worker account?{' '}
              <Link
                to="/worker/signup"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign up here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerLogin;
