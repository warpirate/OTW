import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, EyeIcon, DocumentIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import AdminService from '../../services/admin.service';
import config from '../../environments';

const ProviderDetailsPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [providerDetails, setProviderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationLoading, setVerificationLoading] = useState({});
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [loadingProfilePicture, setLoadingProfilePicture] = useState(false);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    }
  }, [providerId]);

  useEffect(() => {
    if (providerDetails?.basicInfo?.profile_picture_url && providerDetails.basicInfo.profile_picture_url.trim() !== '') {
      loadProfilePicture();
    } else {
      // Clear profile picture URL if no profile picture exists
      setProfilePictureUrl(null);
      setLoadingProfilePicture(false);
    }
  }, [providerDetails?.basicInfo?.profile_picture_url]);

  const loadProfilePicture = async () => {
    try {
      setLoadingProfilePicture(true);
      const actualProviderId = providerDetails?.basicInfo?.provider_id;
      const response = await AdminService.getProviderProfilePictureUrl(actualProviderId);
      if (response?.url) {
        setProfilePictureUrl(response.url);
      } else {
        setProfilePictureUrl(null);
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
      setProfilePictureUrl(null);
    } finally {
      setLoadingProfilePicture(false);
    }
  };

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch all provider data in parallel
      const [basicInfo, bankingDetails, documents, qualifications, driverDetails] = await Promise.allSettled([
        AdminService.getProvider(providerId),
        AdminService.getProviderBankingDetails(providerId),
        AdminService.getProviderDocuments(providerId),
        AdminService.getProviderQualifications(providerId),
        AdminService.getProviderDriverDetails(providerId)
      ]);

      setProviderDetails({
        basicInfo: basicInfo.status === 'fulfilled' ? basicInfo.value.data : null,
        banking: bankingDetails.status === 'fulfilled' ? bankingDetails.value.data : [],
        documents: documents.status === 'fulfilled' ? documents.value.data : [],
        qualifications: qualifications.status === 'fulfilled' ? qualifications.value.data : [],
        driverDetails: driverDetails.status === 'fulfilled' ? driverDetails.value.data : null
      });
    } catch (error) {
      console.error('Error fetching provider details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentVerification = async (documentId, status, remarks = '') => {
    try {
      setVerificationLoading(prev => ({ ...prev, [`doc_${documentId}`]: true }));
      
      await AdminService.verifyProviderDocument(documentId, {
        status,
        remarks
      });
      
      // Refresh documents
      const updatedDocuments = await AdminService.getProviderDocuments(providerId);
      setProviderDetails(prev => ({
        ...prev,
        documents: updatedDocuments.data
      }));
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Failed to verify document');
    } finally {
      setVerificationLoading(prev => ({ ...prev, [`doc_${documentId}`]: false }));
    }
  };

  const handleBankingVerification = async (bankingId, status, remarks = '') => {
    try {
      setVerificationLoading(prev => ({ ...prev, [`bank_${bankingId}`]: true }));
      
      await AdminService.verifyBankingDetails(bankingId, {
        status,
        remarks
      });
      
      // Refresh banking details
      const updatedBanking = await AdminService.getProviderBankingDetails(providerId);
      setProviderDetails(prev => ({
        ...prev,
        banking: updatedBanking.data
      }));
    } catch (error) {
      console.error('Error verifying banking details:', error);
      alert('Failed to verify banking details');
    } finally {
      setVerificationLoading(prev => ({ ...prev, [`bank_${bankingId}`]: false }));
    }
  };

  const handleQualificationVerification = async (qualificationId, status, remarks = '') => {
    try {
      setVerificationLoading(prev => ({ ...prev, [`qual_${qualificationId}`]: true }));
      
      await AdminService.verifyQualification(qualificationId, {
        status,
        remarks
      });
      
      // Refresh qualifications
      const updatedQualifications = await AdminService.getProviderQualifications(providerId);
      setProviderDetails(prev => ({
        ...prev,
        qualifications: updatedQualifications.data
      }));
    } catch (error) {
      console.error('Error verifying qualification:', error);
      alert('Failed to verify qualification');
    } finally {
      setVerificationLoading(prev => ({ ...prev, [`qual_${qualificationId}`]: false }));
    }
  };

  const openQualificationCertificate = async (qualificationId) => {
    try {
      const resp = await AdminService.getQualificationCertificatePresignedUrl(qualificationId);
      const url = resp?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('No certificate available for this qualification');
      }
    } catch (error) {
      console.error('Error opening qualification certificate:', error);
      alert('Failed to open certificate');
    }
  };

  const openDocument = async (documentId, fallbackFileUrl) => {
    try {
      const resp = await AdminService.getDocumentPresignedUrl(documentId);
      const url = resp?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    } catch (e) {
      console.warn('Presigned URL fetch failed, falling back to local path', e);
    }
    // Fallback to local uploads path if present
    if (fallbackFileUrl) {
      const isAbsolute = /^(http|https):\/\//i.test(fallbackFileUrl);
      const fullUrl = isAbsolute ? fallbackFileUrl : `${config.backend?.uploadsUrl ? config.backend.uploadsUrl + '/' : ''}${fallbackFileUrl}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: '👤' },
    { id: 'banking', name: 'Banking Details', icon: '🏦' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'qualifications', name: 'Qualifications', icon: '🎓' },
    { id: 'driver', name: 'Driver Details', icon: '🚗' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!providerDetails?.basicInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Provider Not Found</h1>
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Users
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {providerDetails.basicInfo.name}
                </h1>
                <p className="text-gray-600">Provider ID: {providerDetails.basicInfo.provider_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                providerDetails.basicInfo.verified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {providerDetails.basicInfo.verified ? 'Verified' : 'Pending Verification'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                providerDetails.basicInfo.active 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {providerDetails.basicInfo.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
            
            {/* Profile Picture Section */}
            <div className="flex items-start space-x-6 mb-8 pb-6 border-b border-gray-200">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                  {loadingProfilePicture ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  ) : profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt={`${providerDetails.basicInfo.name}'s profile`}
                      className="w-full h-full object-cover"
                      onError={() => setProfilePictureUrl(null)}
                    />
                  ) : (
                    <UserCircleIcon className="h-20 w-20 text-gray-400" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{providerDetails.basicInfo.name}</h3>
                <p className="text-gray-600 mt-1">Provider ID: {providerDetails.basicInfo.provider_id}</p>
                <div className="flex items-center space-x-3 mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    providerDetails.basicInfo.verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {providerDetails.basicInfo.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    providerDetails.basicInfo.active 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {providerDetails.basicInfo.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Full Name</label>
                  <p className="mt-1 text-lg text-gray-900">{providerDetails.basicInfo.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Email</label>
                  <p className="mt-1 text-gray-900">{providerDetails.basicInfo.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Phone</label>
                  <p className="mt-1 text-gray-900">{providerDetails.basicInfo.phone_number}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Experience</label>
                  <p className="mt-1 text-gray-900">{providerDetails.basicInfo.experience_years} years</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Rating</label>
                  <p className="mt-1 text-gray-900">⭐ {providerDetails.basicInfo.rating || 'No ratings yet'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Service Radius</label>
                  <p className="mt-1 text-gray-900">{providerDetails.basicInfo.service_radius_km} km</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Emergency Contact</label>
                  <p className="mt-1 text-gray-900">{providerDetails.basicInfo.emergency_contact_name}</p>
                  <p className="text-sm text-gray-600">{providerDetails.basicInfo.emergency_contact_relationship}</p>
                  <p className="text-sm text-gray-600">{providerDetails.basicInfo.emergency_contact_phone}</p>
                </div>
              </div>
            </div>

            {providerDetails.basicInfo.bio && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Bio</label>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{providerDetails.basicInfo.bio}</p>
              </div>
            )}

            {/* Services Section */}
            {providerDetails.basicInfo.services && providerDetails.basicInfo.services.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-600 mb-3">Services Offered</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {providerDetails.basicInfo.services.map((service, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-blue-900">{service.subcategory_name}</div>
                      <div className="text-xs text-blue-600">{service.category_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Banking Details Tab */}
        {activeTab === 'banking' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Banking Details</h2>
            {providerDetails.banking && providerDetails.banking.length > 0 ? (
              <div className="space-y-6">
                {providerDetails.banking.map((bank) => (
                  <div key={bank.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{bank.bank_name}</h3>
                        <p className="text-gray-600">{bank.branch_name}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {bank.is_primary && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(bank.status)}`}>
                          {bank.status || 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Account Holder</label>
                        <p className="mt-1 text-gray-900">{bank.account_holder_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Account Number</label>
                        <p className="mt-1 text-gray-900">****{bank.account_number.slice(-4)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">IFSC Code</label>
                        <p className="mt-1 text-gray-900">{bank.ifsc_code}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Account Type</label>
                        <p className="mt-1 text-gray-900 capitalize">{bank.account_type}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Added On</label>
                        <p className="mt-1 text-gray-900">{new Date(bank.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {bank.verification_remarks && (
                      <div className="mb-4 p-3 bg-gray-50 rounded">
                        <label className="block text-sm font-medium text-gray-600">Verification Remarks</label>
                        <p className="mt-1 text-gray-900">{bank.verification_remarks}</p>
                      </div>
                    )}

                    {bank.status !== 'verified' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            const remarks = prompt('Enter verification remarks (optional):');
                            handleBankingVerification(bank.id, 'verified', remarks || '');
                          }}
                          disabled={verificationLoading[`bank_${bank.id}`]}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          {verificationLoading[`bank_${bank.id}`] ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                          onClick={() => {
                            const remarks = prompt('Enter rejection reason:');
                            if (remarks) {
                              handleBankingVerification(bank.id, 'rejected', remarks);
                            }
                          }}
                          disabled={verificationLoading[`bank_${bank.id}`]}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No banking details found</p>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Documents</h2>
            {providerDetails.documents && providerDetails.documents.length > 0 ? (
              <div className="space-y-6">
                {providerDetails.documents.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 capitalize">
                          {doc.document_type.replace('_', ' ')}
                        </h3>
                        <p className="text-gray-600">Document ID: {doc.id}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(doc.status)}`}>
                          {doc.status || 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Uploaded On</label>
                        <p className="mt-1 text-gray-900">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Verified On</label>
                        <p className="mt-1 text-gray-900">
                          {doc.verified_at ? new Date(doc.verified_at).toLocaleDateString() : 'Not verified'}
                        </p>
                      </div>
                    </div>

                    {doc.remarks && (
                      <div className="mb-4 p-3 bg-gray-50 rounded">
                        <label className="block text-sm font-medium text-gray-600">Remarks</label>
                        <p className="mt-1 text-gray-900">{doc.remarks}</p>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        onClick={() => openDocument(doc.id, doc.document_url)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View File
                      </button>
                      
                      {doc.status !== 'verified' && (
                        <>
                          <button
                            onClick={() => {
                              const remarks = prompt('Enter verification remarks (optional):');
                              handleDocumentVerification(doc.id, 'verified', remarks || '');
                            }}
                            disabled={verificationLoading[`doc_${doc.id}`]}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            {verificationLoading[`doc_${doc.id}`] ? 'Verifying...' : 'Verify'}
                          </button>
                          <button
                            onClick={() => {
                              const remarks = prompt('Enter rejection reason:');
                              if (remarks) {
                                handleDocumentVerification(doc.id, 'rejected', remarks);
                              }
                            }}
                            disabled={verificationLoading[`doc_${doc.id}`]}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircleIcon className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <DocumentIcon className="h-12 w-12 mx-auto mb-4" />
                <p>No documents found</p>
              </div>
            )}
          </div>
        )}

        {/* Qualifications Tab */}
        {activeTab === 'qualifications' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Qualifications</h2>
            {providerDetails.qualifications && providerDetails.qualifications.length > 0 ? (
              <div className="space-y-6">
                {providerDetails.qualifications.map((qual) => (
                  <div key={qual.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{qual.qualification_name}</h3>
                        <p className="text-gray-600">{qual.institution}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(qual.status)}`}>
                          {qual.status ? qual.status.replace('_', ' ') : 'Pending Review'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Institution</label>
                        <p className="mt-1 text-gray-900">{qual.institution}</p>
                      </div>
                      {qual.issue_date && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Issue Date</label>
                          <p className="mt-1 text-gray-900">{new Date(qual.issue_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {qual.certificate_number && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Certificate Number</label>
                          <p className="mt-1 text-gray-900">{qual.certificate_number}</p>
                        </div>
                      )}
                      {qual.created_at && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Submitted On</label>
                          <p className="mt-1 text-gray-900">{new Date(qual.created_at).toLocaleDateString()}</p>
                        </div>
                      )}
                      {qual.updated_at && qual.status !== 'pending_review' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Last Updated</label>
                          <p className="mt-1 text-gray-900">{new Date(qual.updated_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {qual.remarks && (
                      <div className="mb-4 p-3 bg-gray-50 rounded">
                        <label className="block text-sm font-medium text-gray-600">Admin Remarks</label>
                        <p className="mt-1 text-gray-900">{qual.remarks}</p>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      {qual.has_certificate && (
                        <button
                          onClick={() => openQualificationCertificate(qual.id)}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          View Certificate
                        </button>
                      )}
                      
                      {qual.status !== 'approved' && (
                        <>
                          <button
                            onClick={() => {
                              const remarks = prompt('Enter approval remarks (optional):');
                              handleQualificationVerification(qual.id, 'approved', remarks || '');
                            }}
                            disabled={verificationLoading[`qual_${qual.id}`]}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            {verificationLoading[`qual_${qual.id}`] ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              const remarks = prompt('Enter rejection reason:');
                              if (remarks) {
                                handleQualificationVerification(qual.id, 'rejected', remarks);
                              }
                            }}
                            disabled={verificationLoading[`qual_${qual.id}`]}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircleIcon className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No qualifications found</p>
              </div>
            )}
          </div>
        )}

        {/* Driver Details Tab */}
        {activeTab === 'driver' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Driver Details</h2>
            {providerDetails.driverDetails ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">License Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">License Number</label>
                        <p className="mt-1 text-gray-900">{providerDetails.driverDetails.license_number}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Issuing Authority</label>
                        <p className="mt-1 text-gray-900">{providerDetails.driverDetails.license_issuing_authority}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Expiry Date</label>
                        <p className="mt-1 text-gray-900">{new Date(providerDetails.driverDetails.license_expiry_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Driving Experience</label>
                        <p className="mt-1 text-gray-900">{providerDetails.driverDetails.driving_experience_years} years</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Commercial Experience</label>
                        <p className="mt-1 text-gray-900">{providerDetails.driverDetails.years_of_commercial_driving_exp} years</p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Vehicle Type</label>
                        <p className="mt-1 text-gray-900 capitalize">{providerDetails.driverDetails.vehicle_type}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Registration Number</label>
                        <p className="mt-1 text-gray-900">{providerDetails.driverDetails.vehicle_registration_number}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No driver details found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderDetailsPage;
