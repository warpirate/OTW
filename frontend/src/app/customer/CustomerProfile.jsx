import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Edit2, Save, X, Mail, Phone, MapPin, Calendar, Shield, CreditCard } from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import AuthService from '../services/auth.service';
import ProfileService from '../services/profile.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toast } from 'react-toastify';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalProfile, setOriginalProfile] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    country: '',
    location_lat: '',
    location_lng: '',
    gender: ''
  });

  // Listen for theme changes
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

  // Check authentication and load profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Check if user is authenticated
        if (!AuthService.isLoggedIn('customer')) {
          navigate('/login');
          return;
        }

        const response = await ProfileService.getProfile();
        // Backend returns profile data directly, not wrapped in a profile object
        const profileData = response || {};
        setProfile(profileData);
        setOriginalProfile(profileData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ProfileService.updateProfile(profile);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      // Update original profile after successful save
      setOriginalProfile(profile);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original profile data without making API call
    if (originalProfile) {
      setProfile(originalProfile);
    }
    setIsEditing(false);
  };

  // Calculate profile completion
  const completionStatus = (() => {
    const fields = ['name', 'email', 'phone_number', 'address', 'city', 'state', 'pin_code'];
    const filledFields = fields.filter(field => profile[field] && profile[field].toString().trim() !== '');
    const completionPercentage = Math.round((filledFields.length / fields.length) * 100);
    const missingFields = fields.filter(field => !profile[field] || profile[field].toString().trim() === '');
    
    return {
      completionPercentage,
      missingFields
    };
  })();

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Header />
        <div className="container-custom py-16">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <Header />
      
      <div className="container-custom py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              My Profile
            </h1>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your personal information and preferences
            </p>
            
            {/* Profile Completion Indicator */}
            <div className={`card p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Profile Completion
                </span>
                <span className={`text-sm font-bold ${
                  completionStatus.completionPercentage === 100 
                    ? 'text-green-600' 
                    : completionStatus.completionPercentage >= 60 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                }`}>
                  {completionStatus.completionPercentage}%
                </span>
              </div>
              <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    completionStatus.completionPercentage === 100 
                      ? 'bg-green-500' 
                      : completionStatus.completionPercentage >= 60 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${completionStatus.completionPercentage}%` }}
                ></div>
              </div>
              {completionStatus.missingFields.length > 0 && (
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Missing: {completionStatus.missingFields.join(', ').replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>

          {/* Quick Access Menu */}
          <div className={`card p-6 mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/payment-methods')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  darkMode 
                    ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Payment Methods
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Manage UPI payments
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/bookings')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  darkMode 
                    ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      My Bookings
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      View booking history
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/payment-history')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  darkMode 
                    ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Payment History
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Transaction records
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Profile Card */}
          <div className={`card p-8 mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 rounded-full p-4">
                  <User className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {profile.name || 'Customer'}
                  </h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Customer Account
                  </p>
                </div>
              </div>
              
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-outline flex items-center space-x-2"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-brand flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="btn-outline flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Personal Information
                </h3>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={profile.name || ''}
                    onChange={handleInputChange}
                    disabled
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isEditing
                        ? darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                        : darkMode
                          ? 'bg-gray-800 border-gray-700 text-gray-400'
                          : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profile.email || ''}
                    onChange={handleInputChange}
                    disabled
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isEditing
                        ? darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                        : darkMode
                          ? 'bg-gray-800 border-gray-700 text-gray-400'
                          : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={profile.phone_number || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isEditing
                        ? darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                        : darkMode
                          ? 'bg-gray-800 border-gray-700 text-gray-400'
                          : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      name="gender"
                      value={profile.gender || ''}
                      onChange={handleInputChange}
                      disabled
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                      }`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  ) : (
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {profile.gender
                        ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace(/_/g, ' ')
                        : 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Address Information
                </h3>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={profile.address || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isEditing
                        ? darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                        : darkMode
                          ? 'bg-gray-800 border-gray-700 text-gray-400'
                          : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={profile.city || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isEditing
                          ? darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          : darkMode
                            ? 'bg-gray-800 border-gray-700 text-gray-400'
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={profile.state || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isEditing
                          ? darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          : darkMode
                            ? 'bg-gray-800 border-gray-700 text-gray-400'
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={profile.country || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isEditing
                          ? darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          : darkMode
                            ? 'bg-gray-800 border-gray-700 text-gray-400'
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      PIN Code
                    </label>
                    <input
                      type="text"
                      name="pin_code"
                      value={profile.pin_code || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isEditing
                          ? darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          : darkMode
                            ? 'bg-gray-800 border-gray-700 text-gray-400'
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default CustomerProfile; 