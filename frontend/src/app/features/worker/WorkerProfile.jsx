import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit2, 
  Save, 
  X, 
  Briefcase,
  Clock,
  Map,
  Star,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import AuthService from '../../services/auth.service';
import WorkerService from '../../services/worker.service';
import { toast } from 'react-toastify';

const WorkerProfile = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    // User fields
    name: '',
    email: '',
    phone_number: '',
    // Provider fields
    experience_years: 0,
    bio: '',
    service_radius_km: 0,
    location_lat: '',
    location_lng: '',
    verified: false,
    active: true,
    rating: 0.0,
    provider_id: null,
    created_at: null,
    updated_at: null
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
        // Check if user is authenticated as worker
        if (!AuthService.isLoggedIn('worker')) {
          navigate('/worker/login');
          return;
        }

        const profileData = await WorkerService.getProfile();
        const formattedProfile = formatProfileData(profileData.profile);
        const completion = getProfileCompletionStatus(profileData.profile);
        
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

  // Format profile data for display
  const formatProfileData = (profileData) => {
    return {
      ...profileData,
      displayName: profileData.name || 'Worker',
      formattedPhone: profileData.phone_number ? 
        profileData.phone_number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : 
        null,
      hasLocation: profileData.location_lat && profileData.location_lng,
      experienceDisplay: profileData.experience_years ? 
        `${profileData.experience_years} year${profileData.experience_years !== 1 ? 's' : ''}` : 
        'Not specified'
    };
  };

  // Get profile completion status
  const getProfileCompletionStatus = (profileData) => {
    const requiredFields = ['bio', 'experience_years', 'service_radius_km', 'location_lat', 'location_lng'];
    const completedFields = requiredFields.filter(field => {
      const value = profileData[field];
      if (field === 'experience_years' || field === 'service_radius_km') {
        return value && value > 0;
      }
      return value && value.toString().trim().length > 0;
    });
    
    return {
      completionPercentage: Math.round((completedFields.length / requiredFields.length) * 100),
      completedFields: completedFields.length,
      totalFields: requiredFields.length,
      missingFields: requiredFields.filter(field => {
        const value = profileData[field];
        if (field === 'experience_years' || field === 'service_radius_km') {
          return !value || value <= 0;
        }
        return !value || value.toString().trim().length === 0;
      }).map(field => field.replace(/_/g, ' '))
    };
  };

  // Validate profile data before sending
  const validateProfileData = (profileData) => {
    const errors = {};
    
    // Validate experience years
    if (profileData.experience_years && (profileData.experience_years < 0 || profileData.experience_years > 50)) {
      errors.experience_years = 'Experience must be between 0 and 50 years';
    }
    
    // Validate service radius
    if (profileData.service_radius_km && (profileData.service_radius_km < 1 || profileData.service_radius_km > 100)) {
      errors.service_radius_km = 'Service radius must be between 1 and 100 km';
    }
    
    // Validate latitude range
    if (profileData.location_lat && (profileData.location_lat < -90 || profileData.location_lat > 90)) {
      errors.location_lat = 'Latitude must be between -90 and 90';
    }
    
    // Validate longitude range
    if (profileData.location_lng && (profileData.location_lng < -180 || profileData.location_lng > 180)) {
      errors.location_lng = 'Longitude must be between -180 and 180';
    }
    
    // Validate bio length
    if (profileData.bio && profileData.bio.trim().length < 10) {
      errors.bio = 'Bio must be at least 10 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? parseFloat(value) || 0 : value;
    
    setEditedProfile(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send the editable fields to the update endpoint
      const updateData = {
        name: editedProfile.name,
        phone_number: editedProfile.phone_number,
        experience_years: editedProfile.experience_years,
        bio: editedProfile.bio,
        service_radius_km: editedProfile.service_radius_km,
        location_lat: editedProfile.location_lat,
        location_lng: editedProfile.location_lng,
        active: editedProfile.active
      };

      // Validate data before sending
      const validation = validateProfileData(updateData);
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(', ');
        toast.error(`Please fix the following errors: ${errorMessages}`);
        setSaving(false);
        return;
      }

      const response = await WorkerService.updateProfile(updateData);
      
      const updatedProfile = formatProfileData(response.profile);
      const updatedCompletion = getProfileCompletionStatus(response.profile);
      
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
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/worker/dashboard')}
                  className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  My Profile
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/worker/dashboard')}
                className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                My Profile
              </h1>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Worker Profile
            </h2>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your professional information and service settings
            </p>
            
            {/* Profile Completion Indicator */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
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
                  Missing: {completionStatus.missingFields.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Profile Card */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 mb-8 shadow-sm`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 rounded-full p-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {profile.displayName}
                  </h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Service Provider
                    </p>
                    <div className="flex items-center space-x-1">
                      {profile.verified ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 text-sm font-medium">Verified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-red-600 text-sm font-medium">Not Verified</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-600" />
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {parseFloat(profile.rating || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
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
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
                      darkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h4 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Personal Information
                </h4>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={editedProfile.name || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}>
                      {profile.name || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email Address
                  </label>
                  <div className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500'
                  }`}>
                    {profile.email || 'Not provided'}
                  </div>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Contact support to change your email
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone_number"
                      value={editedProfile.phone_number || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}>
                      {profile.formattedPhone || profile.phone_number || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Professional Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={editedProfile.bio || ''}
                      onChange={handleInputChange}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Describe your skills, experience, and what makes you unique..."
                    />
                  ) : (
                    <div className={`w-full px-3 py-2 border rounded-lg min-h-[100px] ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}>
                      {profile.bio || 'No bio provided'}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Information */}
              <div className="space-y-6">
                <h4 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Service Information
                </h4>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Years of Experience
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="experience_years"
                      value={editedProfile.experience_years || 0}
                      onChange={handleInputChange}
                      min="0"
                      max="50"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter years of experience"
                    />
                  ) : (
                    <div className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}>
                      {profile.experienceDisplay}
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Service Radius (km)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="service_radius_km"
                      value={editedProfile.service_radius_km || 0}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter service radius in kilometers"
                    />
                  ) : (
                    <div className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}>
                      {profile.service_radius_km ? `${profile.service_radius_km} km` : 'Not specified'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Enter latitude"
                      />
                    ) : (
                      <div className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}>
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
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Enter longitude"
                      />
                    ) : (
                      <div className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}>
                        {profile.location_lng || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="active"
                      name="active"
                      checked={editedProfile.active}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, active: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="active" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Available for new jobs
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
            <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Account Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Verification</span>
                </div>
                <p className={`${profile.verified ? 'text-green-600' : 'text-red-600'}`}>
                  {profile.verified ? 'Verified' : 'Not Verified'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Status</span>
                </div>
                <p className={`${profile.active ? 'text-green-600' : 'text-red-600'}`}>
                  {profile.active ? 'Active' : 'Inactive'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Rating</span>
                </div>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {parseFloat(profile.rating || 0).toFixed(1)} / 5.0
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Member Since</span>
                </div>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerProfile; 