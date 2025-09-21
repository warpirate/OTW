import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Phone, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';
import Logo from '../../components/Logo';

const CustomerLogin = () => {
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
  };

  const handleSendOtp = async () => {
    try {
      // Call the requestOTP method from AuthService
      await AuthService.requestOTP(formData.phone);
      setIsOtpSent(true);
      toast.success("OTP sent successfully!");
    } catch (error) {
      // Display error toast
      toast.error(error?.response?.data?.message || "Failed to send OTP. Please try again.");
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (loginMethod === 'email') {
        // Use email/password login
        await AuthService.login(formData.email, formData.password, 'customer');
      } else if (loginMethod === 'phone' && isOtpSent) {
        // Use phone/OTP login
        await AuthService.loginWithOTP(formData.phone, formData.otp, 'customer');
      }
      
      // Verify we received a token for the correct role
      const user = AuthService.getCurrentUser('customer');
      if (!user || user.role !== 'customer') {
        throw new Error('You do not have customer privileges');
      }
      
      // If login successful, show success toast and navigate
      toast.success("Login successful!");
      // If login successful, navigate to home or dashboard
      navigate('/');
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    // Handle social login
  };

  return (
    <div className="min-h-screen transition-colors bg-[var(--bg-secondary)]">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl lg:flex lg:items-start lg:space-x-8 text-[var(--text-primary)]">
          {/* Left Side: Header and Title */}
          <div className="lg:w-1/2 mb-8 lg:mb-0 lg:sticky lg:top-24">
            <div className="md:text-center lg:text-left lg:pr-8">
              <Link to="/" className="inline-flex items-center mb-4 text-blue-600 hover:text-blue-500">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Link>
              <h2 className="text-3xl font-bold text-[var(--text-primary)]">Welcome Back</h2>
              <p className="mt-2 text-[var(--text-secondary)]">Sign in to your OMW account</p>
            </div>
          </div>

          {/* Right Side: Form Content */}
          <div className="lg:w-1/2">
            {/* Login Form */}
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-lg p-8 border border-[var(--border-color)]">
              {/* Logo */}
              <div className="flex items-center mb-6">
                <Logo size="xl" alt="OMW" className="mr-3" />
              </div>
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Login Method Toggle */}
                <div className="flex p-1 rounded-lg bg-[var(--bg-secondary)]">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      loginMethod === 'email'
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      loginMethod === 'phone'
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Phone className="h-4 w-4 inline mr-2" />
                    Phone
                  </button>
                </div>

                {/* Email Login */}
                {loginMethod === 'email' && (
                  <>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Email Address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12 bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Phone Login */}
                {loginMethod === 'phone' && (
                  <>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Phone Number
                      </label>
                      <div className="flex">
                        <select className="px-3 py-3 border border-[var(--border-color)] rounded-l-lg bg-[var(--bg-primary)] text-[var(--text-primary)]">
                          <option>+1</option>
                          <option>+91</option>
                        </select>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="flex-1 px-4 py-3 border border-l-0 border-[var(--border-color)] rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[var(--bg-primary)] text-[var(--text-primary)]"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    {!isOtpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="w-full btn-brand"
                      >
                        Send OTP
                      </button>
                    ) : (
                      <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Enter OTP
                        </label>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          required
                          value={formData.otp}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                          placeholder="Enter 6-digit OTP"
                          maxLength="6"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          Didn't receive OTP? 
                          <button type="button" className="text-blue-600 hover:text-blue-700 ml-1">
                            Resend
                          </button>
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Submit Button */}
                {(loginMethod === 'email' || isOtpSent) && (
                  <button
                    type="submit"
                    className="w-full btn-brand"
                  >
                    Sign In
                  </button>
                )}

                {/* Forgot Password */}
                {loginMethod === 'email' && (
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                      Forgot your password?
                    </Link>
                  </div>
                )}
              </form>

              {/* Divider */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
              </div>

              {/* Social Login */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="ml-2">Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin('facebook')}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="ml-2">Facebook</span>
                </button>
              </div>

              {/* Sign Up Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
