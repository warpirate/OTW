import React from 'react';
import AdminService from '../../services/admin.service';
import config from '../../environments';

const ProviderDetailModal = ({ 
  selectedProvider, 
  showModal, 
  setShowModal, 
  activeTab, 
  setActiveTab, 
  providerDetails, 
  detailsLoading, 
  actionLoading, 
  handleApproveProvider, 
  handleRejectProvider, 
  handleToggleActive, 
  handleDeleteProvider 
}) => {
  if (!showModal || !selectedProvider) return null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      // Silent fallback
    }
    if (fallbackFileUrl) {
      const isAbsolute = /^(http|https):\/\//i.test(fallbackFileUrl);
      const fullUrl = isAbsolute ? fallbackFileUrl : `${config.backend?.uploadsUrl ? config.backend.uploadsUrl + '/' : ''}${fallbackFileUrl}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
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

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Provider Details - {selectedProvider.name}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <nav className="flex space-x-8">
              {[
                { id: 'basic', label: 'Basic Info', icon: '👤' },
                { id: 'banking', label: 'Banking Details', icon: '🏦' },
                { id: 'documents', label: 'Documents', icon: '📄' },
                { id: 'qualifications', label: 'Qualifications', icon: '🎓' },
                { id: 'driver', label: 'Driver Details', icon: '🚗' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-md'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {detailsLoading && activeTab !== 'basic' ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-500">Loading details...</span>
              </div>
            ) : (
              <>
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Personal Information</h3>
                        <div className="space-y-2">
                          <p><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-900">{selectedProvider.name}</span></p>
                          <p><span className="font-medium text-gray-600">Email:</span> <span className="text-gray-900">{selectedProvider.email}</span></p>
                          <p><span className="font-medium text-gray-600">Phone:</span> <span className="text-gray-900">{selectedProvider.phone}</span></p>
                          <p><span className="font-medium text-gray-600">Experience:</span> <span className="text-gray-900">{selectedProvider.experience_years} years</span></p>
                          <p><span className="font-medium text-gray-600">Rating:</span> <span className="text-gray-900">{selectedProvider.rating?.toFixed(1) || 'N/A'} ⭐</span></p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Address</h3>
                        {selectedProvider.permanent_address ? (
                          <div className="space-y-2">
                            <p><span className="font-medium text-gray-600">Street:</span> <span className="text-gray-900">{selectedProvider.permanent_address.street || 'N/A'}</span></p>
                            <p><span className="font-medium text-gray-600">City:</span> <span className="text-gray-900">{selectedProvider.permanent_address.city || 'N/A'}</span></p>
                            <p><span className="font-medium text-gray-600">State:</span> <span className="text-gray-900">{selectedProvider.permanent_address.state || 'N/A'}</span></p>
                            <p><span className="font-medium text-gray-600">ZIP Code:</span> <span className="text-gray-900">{selectedProvider.permanent_address.zip_code || 'N/A'}</span></p>
                          </div>
                        ) : (
                          <p className="text-gray-500">No address information available</p>
                        )}
                      </div>
                    </div>
                    
                    {selectedProvider.bio && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Bio</h3>
                        <p className="text-gray-900">{selectedProvider.bio}</p>
                      </div>
                    )}

                    {selectedProvider.emergency_contact && selectedProvider.emergency_contact.name && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Emergency Contact</h3>
                        <p className="text-gray-900">
                          <span className="font-medium">{selectedProvider.emergency_contact.name}</span> ({selectedProvider.emergency_contact.relationship})<br/>
                          <span className="text-gray-600">Phone:</span> {selectedProvider.emergency_contact.phone}
                        </p>
                      </div>
                    )}

                    {selectedProvider.services && selectedProvider.services.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Services Offered</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedProvider.services.map((service, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border shadow-sm">
                              <span className="font-medium text-blue-600">{service.category_name}</span>
                              <br/>
                              <span className="text-sm text-gray-600">{service.subcategory_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Banking Details Tab */}
                {activeTab === 'banking' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Banking Details</h3>
                    {providerDetails.banking.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providerDetails.banking.map((bank) => (
                          <div key={bank.id} className={`p-4 rounded-lg border-2 ${bank.is_primary ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                            {bank.is_primary && (
                              <div className="mb-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Primary Account
                                </span>
                              </div>
                            )}
                            <div className="space-y-2">
                              <p><span className="font-medium text-gray-600">Bank:</span> <span className="text-gray-900">{bank.bank_name}</span></p>
                              <p><span className="font-medium text-gray-600">Branch:</span> <span className="text-gray-900">{bank.branch_name}</span></p>
                              <p><span className="font-medium text-gray-600">Account Holder:</span> <span className="text-gray-900">{bank.account_holder_name}</span></p>
                              <p><span className="font-medium text-gray-600">Account Number:</span> <span className="text-gray-900">****{bank.account_number.slice(-4)}</span></p>
                              <p><span className="font-medium text-gray-600">IFSC Code:</span> <span className="text-gray-900">{bank.ifsc_code}</span></p>
                              <p><span className="font-medium text-gray-600">Type:</span> <span className="text-gray-900 capitalize">{bank.account_type}</span></p>
                              <p><span className="font-medium text-gray-600">Status:</span> 
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(bank.status)}`}>
                                  {bank.status || 'Unverified'}
                                </span>
                              </p>
                              <p><span className="font-medium text-gray-600">Added:</span> <span className="text-gray-900">{new Date(bank.created_at).toLocaleDateString()}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-gray-500">No banking details found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Documents</h3>
                    {providerDetails.documents.length > 0 ? (
                      <div className="space-y-4">
                        {providerDetails.documents.map((doc) => (
                          <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="font-medium text-gray-900">{doc.file_name}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(doc.status)}`}>
                                    {doc.status || 'Pending'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <p><span className="font-medium text-gray-600">Type:</span> <span className="text-gray-900 capitalize">{doc.document_type.replace('_', ' ')}</span></p>
                                  <p><span className="font-medium text-gray-600">URL:</span> <span className="text-gray-900 text-xs truncate">{doc.document_url}</span></p>
                                  <p><span className="font-medium text-gray-600">Uploaded:</span> <span className="text-gray-900">{new Date(doc.uploaded_at).toLocaleDateString()}</span></p>
                                  <p><span className="font-medium text-gray-600">Verified:</span> <span className="text-gray-900">{doc.verified_at ? new Date(doc.verified_at).toLocaleDateString() : 'Not verified'}</span></p>
                                </div>
                                {doc.remarks && (
                                  <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                                    <span className="font-medium text-gray-600">Remarks:</span> <span className="text-gray-900">{doc.remarks}</span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <button onClick={() => openDocument(doc.id, doc.document_url)} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-300 rounded">
                                  View File
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500">No documents found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Qualifications Tab */}
                {activeTab === 'qualifications' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Qualifications</h3>
                    {providerDetails.qualifications.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providerDetails.qualifications.map((qual) => (
                          <div key={qual.id} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-gray-900">{qual.qualification_name}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(qual.status)}`}>
                                  {qual.status || 'Pending'}
                                </span>
                              </div>
                              <p><span className="font-medium text-gray-600">Institution:</span> <span className="text-gray-900">{qual.institution}</span></p>
                              <p><span className="font-medium text-gray-600">Issue Date:</span> <span className="text-gray-900">{new Date(qual.issue_date).toLocaleDateString()}</span></p>
                              {qual.certificate_number && (
                                <p><span className="font-medium text-gray-600">Cert. Number:</span> <span className="text-gray-900">{qual.certificate_number}</span></p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-gray-500">No qualifications found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Driver Details Tab */}
                {activeTab === 'driver' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Driver Details</h3>
                    {providerDetails.driverDetails ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">License Information</h4>
                          <div className="space-y-2">
                            <p><span className="font-medium text-gray-600">License Number:</span> <span className="text-gray-900">{providerDetails.driverDetails.license_number}</span></p>
                            <p><span className="font-medium text-gray-600">Issuing Authority:</span> <span className="text-gray-900">{providerDetails.driverDetails.license_issuing_authority}</span></p>
                            <p><span className="font-medium text-gray-600">Expires:</span> <span className="text-gray-900">{new Date(providerDetails.driverDetails.license_expiry_date).toLocaleDateString()}</span></p>
                            <p><span className="font-medium text-gray-600">Driving Experience:</span> <span className="text-gray-900">{providerDetails.driverDetails.driving_experience_years} years</span></p>
                            <p><span className="font-medium text-gray-600">Commercial Experience:</span> <span className="text-gray-900">{providerDetails.driverDetails.years_of_commercial_driving_exp} years</span></p>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">Vehicle Information</h4>
                          <div className="space-y-2">
                            <p><span className="font-medium text-gray-600">Type:</span> <span className="text-gray-900 capitalize">{providerDetails.driverDetails.vehicle_type}</span></p>
                            <p><span className="font-medium text-gray-600">Registration Number:</span> <span className="text-gray-900">{providerDetails.driverDetails.vehicle_registration_number}</span></p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 17h4v-2a2 2 0 012-2h2a2 2 0 012 2v2h4" />
                        </svg>
                        <p className="text-gray-500">No driver details found</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Modal Footer with Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
              
              <div className="flex flex-wrap gap-3">
                <button 
                  className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  onClick={() => handleDeleteProvider(selectedProvider.id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Delete Provider'}
                </button>
                
                {!selectedProvider.verified && (
                  <>
                    <button 
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={() => handleRejectProvider(selectedProvider.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : 'Reject'}
                    </button>
                    <button 
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={() => handleApproveProvider(selectedProvider.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : 'Approve'}
                    </button>
                  </>
                )}
                
                <button 
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    selectedProvider.active 
                      ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                  onClick={() => handleToggleActive(selectedProvider.id, selectedProvider.active)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : (selectedProvider.active ? 'Deactivate' : 'Activate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDetailModal;
