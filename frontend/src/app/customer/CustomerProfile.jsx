import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Eye, EyeOff } from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import AuthService from '../services/auth.service';
import ProfileService from '../services/profile.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toast } from 'react-toastify';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    pin_code: '',
    city: '',
    state: '',
    country: '',
    location_lat: '',
    location_lng: ''
  });
  const [editedProfile, setEditedProfile] = useState({});
  const [completionStatus, setCompletionStatus] = useState({
    completionPercentage: 0,
    completedFields: 0,
    totalFields: 0,
    missingFields: []
  });

  // Listen for theme changes
  useEffect(() => {
    setDarkMode(isDarkMode());
    
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    
    return cleanup;
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

        const profileData = await ProfileService.getProfile();
        const formattedProfile = ProfileService.formatProfileData(profileData);
        const completion = ProfileService.getProfileCompletionStatus(profileData);
        
        setProfile(formattedProfile);
        setEditedProfile(formattedProfile);
        setCompletionStatus(completion);
        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile data');
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send the customer table fields to the update endpoint
      const customerData = {
        address: editedProfile.address,
        pin_code: editedProfile.pin_code,
        city: editedProfile.city,
        state: editedProfile.state,
        country: editedProfile.country,
        location_lat: editedProfile.location_lat,
        location_lng: editedProfile.location_lng
      };

      // Validate data before sending
      const validation = ProfileService.validateProfileData(customerData);
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(', ');
        toast.error(`Please fix the following errors: ${errorMessages}`);
        setSaving(false);
        return;
      }

      await ProfileService.updateProfile(customerData);
      
      const updatedProfile = ProfileService.formatProfileData(editedProfile);
      const updatedCompletion = ProfileService.getProfileCompletionStatus(editedProfile);
      
      setProfile(updatedProfile);
      setCompletionStatus(updatedCompletion);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] customer-theme">
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
    <div className="min-h-screen bg-[var(--bg-secondary)] customer-theme">
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
            <div className="card p-4">
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
          <div className="card p-8 mb-8">
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
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Full Name
                  </label>
                  <div className="input-field bg-gray-50 cursor-not-allowed">
                    <input
                      type="text"
                      value={profile.name || ''}
                      disabled
                      className="w-full bg-transparent border-none focus:ring-0 cursor-not-allowed"
                    />
                  </div>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Contact support to change your name
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email Address
                  </label>
                  <div className="input-field bg-gray-50 cursor-not-allowed">
                    <input
                      type="email"
                      value={profile.email || ''}
                      disabled
                      className="w-full bg-transparent border-none focus:ring-0 cursor-not-allowed"
                    />
                  </div>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Contact support to change your email
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone Number
                  </label>
                  <div className="input-field bg-gray-50 cursor-not-allowed">
                    <input
                      type="tel"
                      value={profile.phone_number || ''}
                      disabled
                      className="w-full bg-transparent border-none focus:ring-0 cursor-not-allowed"
                    />
                  </div>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Contact support to change your phone number
                  </p>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Address Information
                </h3>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Street Address
                  </label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={editedProfile.address || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="input-field resize-none"
                      placeholder="Enter your full address"
                    />
                  ) : (
                    <div className="input-field bg-gray-50">
                      <div className="min-h-[72px] flex items-start py-2">
                        {profile.address || 'No address provided'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      PIN Code
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="pin_code"
                        value={editedProfile.pin_code || ''}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Enter PIN code"
                      />
                    ) : (
                      <div className="input-field bg-gray-50">
                        {profile.pin_code || 'Not provided'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      City
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="city"
                        value={editedProfile.city || ''}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Enter city"
                      />
                    ) : (
                      <div className="input-field bg-gray-50">
                        {profile.city || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      State
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="state"
                        value={editedProfile.state || ''}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Enter state"
                      />
                    ) : (
                      <div className="input-field bg-gray-50">
                        {profile.state || 'Not provided'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Country
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="country"
                        value={editedProfile.country || ''}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Enter country"
                      />
                    ) : (
                      <div className="input-field bg-gray-50">
                        {profile.country || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Coordinates (Optional) */}
                
                {/* <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Latitude
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        name="location_lat"
                        value={editedProfile.location_lat || ''}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Enter latitude"
                      />
                    ) : (
                      <div className="input-field bg-gray-50">
                        {profile.location_lat || 'Not provided'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Longitude
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        name="location_lng"
                        value={editedProfile.location_lng || ''}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Enter longitude"
                      />
                    ) : (
                      <div className="input-field bg-gray-50">
                        {profile.location_lng || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div> */}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="card p-6">
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-5 w-5 text-purple-600" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Account Type</span>
                </div>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Customer Account</p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email Status</span>
                </div>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Verified</p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Address Status</span>
                </div>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {profile.address ? 'Complete' : 'Incomplete'}
                </p>
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