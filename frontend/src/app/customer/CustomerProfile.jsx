import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Edit2, Save, X, Mail, Phone, Shield, CreditCard } from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import AuthService from '../services/auth.service';
import ProfileService from '../services/profile.service';
import CustomerVerificationsService from '../services/customerVerifications.service';

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
    gender: ''
  });

  // Verification docs state
  const [docsLoading, setDocsLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [customerType, setCustomerType] = useState('student');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [hasExistingVerification, setHasExistingVerification] = useState(false);
  const [existingVerificationType, setExistingVerificationType] = useState(null);

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
        // After profile load, load verification documents
        await loadDocuments();
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
        setLoading(false);
        setDocsLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const loadDocuments = async () => {
    try {
      setDocsLoading(true);
      const resp = await CustomerVerificationsService.list();
      const docs = resp.documents || [];
      setDocuments(docs);
      
      // Check for existing verification documents
      const existingDoc = docs.find(doc => 
        doc.verification_status === 'pending' || doc.verification_status === 'verified'
      );
      
      if (existingDoc) {
        setHasExistingVerification(true);
        setExistingVerificationType(existingDoc.document_type);
        setCustomerType(existingDoc.document_type); // Set dropdown to existing type
      }
    } catch (e) {
      console.error('Failed to load verification documents', e);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/jpg','image/png','application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, or PDF files are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be 5MB or smaller');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const uploadVerification = async () => {
    if (!selectedFile) {
      toast.info('Please select a file');
      return;
    }
    setUploading(true);
    try {
      // 1) Presign
      const presign = await CustomerVerificationsService.presignUpload({
        file_name: selectedFile.name,
        content_type: selectedFile.type,
        customer_type: customerType
      });
      // 2) PUT to S3
      await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile
      });
      // 3) Confirm
      await CustomerVerificationsService.confirmUpload({
        customer_type: customerType,
        object_key: presign.objectKey
      });
      toast.success('Document uploaded successfully');
      setSelectedFile(null);
      await loadDocuments();
    } catch (e) {
      console.error('Upload failed', e);
      // Handle specific error messages from backend
      const errorMessage = e.response?.data?.message || 'Upload failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenderChange = async (e) => {
    const { value } = e.target;
    
    // Update the profile state immediately
    setProfile(prev => ({
      ...prev,
      gender: value
    }));

    // Save the gender change to backend immediately
    try {
      await ProfileService.updateProfile({ gender: value });
      toast.success('Gender updated successfully');
      // Update original profile to reflect the change
      setOriginalProfile(prev => ({
        ...prev,
        gender: value
      }));
    } catch (error) {
      console.error('Error updating gender:', error);
      toast.error('Failed to update gender');
      // Revert the change if it failed
      setProfile(prev => ({
        ...prev,
        gender: originalProfile.gender || ''
      }));
    }
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
    const fields = ['name', 'email', 'phone_number'];
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
            <div className="max-w-2xl mx-auto">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className={`text-xl font-bold text-center mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={`flex items-center text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <User className="h-4 w-4 mr-2 text-purple-600" />
                      Full Name
                    </label>
                    <div className={`relative ${!isEditing ? 'opacity-75' : ''}`}>
                      <input
                        type="text"
                        name="name"
                        value={profile.name || ''}
                        onChange={handleInputChange}
                        disabled
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 ${
                          isEditing
                            ? darkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                            : darkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-300 cursor-not-allowed'
                              : 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                        }`}
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`flex items-center text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <Mail className="h-4 w-4 mr-2 text-purple-600" />
                      Email Address
                    </label>
                    <div className={`relative ${!isEditing ? 'opacity-75' : ''}`}>
                      <input
                        type="email"
                        name="email"
                        value={profile.email || ''}
                        onChange={handleInputChange}
                        disabled
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 ${
                          isEditing
                            ? darkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                            : darkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-300 cursor-not-allowed'
                              : 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                        }`}
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`flex items-center text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <Phone className="h-4 w-4 mr-2 text-purple-600" />
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="phone_number"
                        value={profile.phone_number || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 ${
                          isEditing
                            ? darkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                            : darkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-300 cursor-not-allowed'
                              : 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                        } ${!isEditing ? 'opacity-75' : ''}`}
                        placeholder="Enter your phone number"
                      />
                      {isEditing && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <Edit2 className="h-4 w-4 text-purple-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`flex items-center text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <User className="h-4 w-4 mr-2 text-purple-600" />
                      Gender
                    </label>
                    <div className="relative">
                      <select
                        name="gender"
                        value={profile.gender || ''}
                        onChange={handleGenderChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 appearance-none cursor-pointer ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                        }`}
                      >
                        <option value="">Select your gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Verification Documents */}
          <div className={`card p-8 mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Verification</h2>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upload a document to get verified and unlock discounts.</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  disabled={hasExistingVerification}
                  className={`px-3 py-2 rounded-lg border ${
                    hasExistingVerification 
                      ? darkMode ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="student">Student</option>
                  <option value="senior_citizen">Senior Citizen</option>
                </select>
                {hasExistingVerification && (
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    You already have a {existingVerificationType === 'student' ? 'Student' : 'Senior Citizen'} verification
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="docUploadInput"
                  disabled={hasExistingVerification}
                />
                <label
                  htmlFor="docUploadInput"
                  className={`btn-outline cursor-pointer ${hasExistingVerification ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Choose File
                </label>
                <button
                  onClick={uploadVerification}
                  disabled={!selectedFile || uploading || hasExistingVerification}
                  className="btn-brand disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {docsLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10">
                  <p>No verification documents uploaded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Uploaded</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 capitalize">
                            {doc.document_type === 'student' ? 'Student' : 
                             doc.document_type === 'senior_citizen' ? 'Senior Citizen' : 
                             (doc.document_type || '').replace('_',' ')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              doc.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                              doc.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.verification_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{new Date(doc.uploaded_at).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={async () => {
                                try {
                                  const resp = await CustomerVerificationsService.presignView(doc.id);
                                  if (resp?.url) window.open(resp.url, '_blank', 'noopener,noreferrer');
                                } catch (e) {
                                  toast.error('Unable to open document');
                                }
                              }}
                              className="btn-outline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default CustomerProfile; 