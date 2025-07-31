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
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    date_of_birth: '',
    gender: '',
    profile_picture: null
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
        setProfile(response.profile || {});
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
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reload profile data to discard changes
    ProfileService.getProfile().then(response => {
      setProfile(response.profile || {});
      setIsEditing(false);
    }).catch(error => {
      console.error('Error reloading profile:', error);
      setIsEditing(false);
    });
  };

  // Calculate profile completion
  const completionStatus = (() => {
    const fields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip_code'];
    const filledFields = fields.filter(field => profile[field] && profile[field].trim() !== '');
    const completionPercentage = Math.round((filledFields.length / fields.length) * 100);
    const missingFields = fields.filter(field => !profile[field] || profile[field].trim() === '');
    
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
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Personal Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={profile.name || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profile.name || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={profile.email || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="Enter your email"
                      />
                    ) : (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profile.email || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={profile.phone || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profile.phone || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="date_of_birth"
                        value={profile.date_of_birth || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profile.date_of_birth || 'Not provided'}
                      </p>
                    )}
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
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
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
                        {profile.gender || 'Not provided'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Address Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Address
                    </label>
                    {isEditing ? (
                      <textarea
                        name="address"
                        value={profile.address || ''}
                        onChange={handleInputChange}
                        rows="3"
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="Enter your address"
                      />
                    ) : (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profile.address || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        City
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="city"
                          value={profile.city || ''}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            darkMode 
                              ? 'border-gray-600 bg-gray-700 text-white' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                          placeholder="City"
                        />
                      ) : (
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {profile.city || 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        State
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="state"
                          value={profile.state || ''}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            darkMode 
                              ? 'border-gray-600 bg-gray-700 text-white' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                          placeholder="State"
                        />
                      ) : (
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {profile.state || 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      ZIP Code
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="zip_code"
                        value={profile.zip_code || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="ZIP Code"
                      />
                    ) : (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {profile.zip_code || 'Not provided'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="h-6 w-6 text-blue-600" />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Security
                </h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your account security settings
              </p>
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-3 mb-3">
                <CreditCard className="h-6 w-6 text-green-600" />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Payment Methods
                </h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your payment information
              </p>
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-3 mb-3">
                <Calendar className="h-6 w-6 text-purple-600" />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Booking History
                </h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                View your past bookings and services
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CustomerProfile; 