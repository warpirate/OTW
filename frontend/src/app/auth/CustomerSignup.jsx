import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';

const CustomerSignup = () => {
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
    // Set initial dark mode
    setDarkMode(isDarkMode());
    
    // Add listener for theme changes
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    
    // Cleanup on unmount
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
    agreeToTerms: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error when user types
    if (error) setError('');
  };

  const handleSendOtp = async () => {
    if (signupMethod === 'phone' && formData.phone) {
      setIsLoading(true);
      try {
        await AuthService.requestOTP(formData.phone);
        setIsOtpSent(true);
        setError('');
        toast.success("OTP sent successfully!");
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to send OTP. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsOtpSent(true); // For email, we'd typically send a verification link
      toast.info("Verification step activated");
    }
  };

  const handleNextStep = () => {
    // Validate fields before proceeding
    if (signupMethod === 'email') {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields');
        toast.error('Please fill in all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        toast.error('Passwords do not match');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        toast.error('Password must be at least 8 characters long');
        return;
      }
    } else if (signupMethod === 'phone' && !formData.phone) {
      setError('Please enter your phone number');
      toast.error('Please enter your phone number');
      return;
    }
    
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      toast.error('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    
    setError('');
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        role_id: 1
      };
      
      if (signupMethod === 'email') {
        userData.email = formData.email;
      } else {
        userData.phone = formData.phone;
        userData.otp = formData.otp;
      }
      
      const response = await AuthService.register(userData);
      
      // Registration successful
      toast.success("Registration successful! Welcome to OTW.");
      navigate('/'); // Redirect to home page after successful signup
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    setIsLoading(true);
    try {
      // This would typically involve OAuth flow with the provider
      // For now, we'll just simulate the process
      await AuthService.socialAuth(provider, 'mock-token-for-demo');
      toast.success(`${provider} signup successful!`);
      navigate('/'); // Redirect after successful social signup
    } catch (err) {
      const errorMessage = `${provider} signup failed. Please try again.`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
              <h2 className="text-3xl font-bold text-[var(--text-primary)]">Create Account</h2>
              <p className="mt-2 text-[var(--text-secondary)]">Join OTW - On The Way and get started today</p>
            </div>
          </div>

          {/* Right Side: Form Content */}
          <div className="lg:w-1/2">
            {/* OTW Logo */}
            <div className="flex items-center mb-6">
              <div className="flex items-center space-x-1 mr-3">
                <span className="text-3xl font-bold text-orange-500">O</span>
                <span className="text-3xl font-bold text-blue-500">T</span>
                <span className="text-3xl font-bold text-green-500">W</span>
              </div>
              <span className="text-yellow-400 text-2xl">👋</span>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-brand' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  {currentStep > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
                </div>
                <span className="ml-2 text-sm font-medium">Details</span>
              </div>
              <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-brand' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  {currentStep > 2 ? <CheckCircle className="h-5 w-5" /> : '2'}
                </div>
                <span className="ml-2 text-sm font-medium">Verify</span>
              </div>
            </div>

            {/* Signup Form */}
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-lg p-8 transition-colors border border-[var(--border-color)]">
            {/* Error Message Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <>
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  {/* Signup Method Toggle */}
                  <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSignupMethod('email')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        signupMethod === 'email'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupMethod('phone')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        signupMethod === 'phone'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone
                    </button>
                  </div>

                  {/* Email Signup */}
                  {signupMethod === 'email' && (
                    <>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                          Email Address
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                          placeholder="Enter your email"
                        />
                      </div>
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
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
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                            placeholder="Create password"
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
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                            placeholder="Confirm password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Phone Signup */}
                  {signupMethod === 'phone' && (
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
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
                          className="flex-1 px-4 py-3 border border-l-0 border-[var(--border-color)] rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--bg-primary)] text-[var(--text-primary)]"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  )}

                  {/* Terms and Conditions */}
                  <div className="flex items-start">
                    <input
                      id="agreeToTerms"
                      name="agreeToTerms"
                      type="checkbox"
                      required
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="agreeToTerms" className="ml-2 text-sm text-[var(--text-secondary)]">
                      I agree to the{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-700">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Continue'}
                  </button>
                </>
              )}

              {/* Step 2: Verification */}
              {currentStep === 2 && (
                <>
                  <div className="text-center mb-6">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Verify Your Account</h3>
                    <p className="text-[var(--text-secondary)]">
                      We've sent a verification code to{' '}
                      <span className="font-medium">
                        {signupMethod === 'email' ? formData.email : formData.phone}
                      </span>
                    </p>
                  </div>

                  {!isOtpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send Verification Code'}
                    </button>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="otp" className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                          Verification Code
                        </label>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          required
                          value={formData.otp}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest bg-[var(--bg-primary)] text-[var(--text-primary)]"
                          placeholder="000000"
                          maxLength="6"
                        />
                        <p className="text-sm text-[var(--text-secondary)] mt-2 text-center">
                          Didn't receive the code?{' '}
                          <button type="button" className="text-blue-600 hover:text-blue-700">
                            Resend
                          </button>
                        </p>
                      </div>

                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 py-3 px-4 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)]"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </form>

            {/* Social Signup - Only show on step 1 */}
            {currentStep === 1 && (
              <>
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-[var(--bg-primary)] text-[var(--text-secondary)]">Or sign up with</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialSignup('google')}
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
                    onClick={() => handleSocialSignup('facebook')}
                    className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="ml-2">Facebook</span>
                  </button>
                </div>
              </>
            )}

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
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

export default CustomerSignup;
