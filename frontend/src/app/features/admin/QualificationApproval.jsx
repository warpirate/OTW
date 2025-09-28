import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import AuthService from '../../services/auth.service';

const QualificationApproval = () => {
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedStatus, setSelectedStatus] = useState('pending_review');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Create API client with auth
  const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/worker`,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add auth interceptor
  apiClient.interceptors.request.use(
    (config) => {
      const token = AuthService.getToken('admin') || AuthService.getToken('worker');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  useEffect(() => {
    fetchQualifications();
  }, [selectedStatus, pagination.page]);

  const fetchQualifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/qualifications', {
        params: {
          status: selectedStatus,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      
      setQualifications(response.data.qualifications);
      setPagination(response.data.pagination);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to fetch qualifications' 
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQualificationStatus = async (qualificationId, status, remarks = '') => {
    try {
      await apiClient.put(`/qualifications/${qualificationId}/status`, {
        status,
        remarks
      });
      
      setMessage({ 
        type: 'success', 
        text: `Qualification ${status} successfully` 
      });
      
      fetchQualifications();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || `Failed to ${status} qualification` 
      });
    }
  };

  const handleApprove = (qualificationId) => {
    if (window.confirm('Are you sure you want to approve this qualification?')) {
      updateQualificationStatus(qualificationId, 'approved');
    }
  };

  const handleReject = (qualificationId) => {
    const remarks = prompt('Please provide rejection remarks (optional):');
    if (remarks !== null) { // User didn't cancel
      updateQualificationStatus(qualificationId, 'rejected', remarks);
    }
  };

  const viewCertificate = async (qualificationId) => {
    try {
      const response = await apiClient.get(`/qualifications/${qualificationId}/presign`);
      const url = response.data?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setMessage({ type: 'error', text: 'Unable to get certificate link' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to get certificate link' 
      });
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'pending_review': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Qualification Approval Management</h1>
          <p className="text-gray-600 mt-2">Review and approve worker qualifications</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Status Filter */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Qualifications List */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading qualifications...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {qualifications.map((qual) => (
                    <div key={qual.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{qual.qualification_name}</h3>
                              <p className="text-gray-600">{qual.issuing_institution}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(qual.status)}`}>
                              {qual.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Provider:</span> {qual.provider_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Email:</span> {qual.provider_email}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Phone:</span> {qual.provider_phone}
                              </p>
                            </div>
                            <div>
                              {qual.issue_date && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Issue Date:</span> {new Date(qual.issue_date).toLocaleDateString()}
                                </p>
                              )}
                              {qual.certificate_number && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Certificate #:</span> {qual.certificate_number}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Submitted:</span> {new Date(qual.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {qual.remarks && (
                            <div className="mb-3 p-2 bg-gray-50 rounded">
                              <p className="text-sm">
                                <span className="font-medium">Remarks:</span> {qual.remarks}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center space-x-3">
                            {qual.certificate_url && (
                              <button
                                onClick={() => viewCertificate(qual.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View Certificate
                              </button>
                            )}
                            
                            {qual.status === 'pending_review' && (
                              <>
                                <button
                                  onClick={() => handleApprove(qual.id)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(qual.id)}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {qualifications.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No qualifications found for the selected status.</p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page {pagination.page} of {pagination.totalPages} 
                      ({pagination.total} total qualifications)
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page <= 1}
                        className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualificationApproval;
