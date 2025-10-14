import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, EyeIcon, CheckIcon, XMarkIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import AdminService from '../../services/admin.service';

const UserManagement = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    verified: '',
    active: '',
    search: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch providers on component mount and filter changes
  useEffect(() => {
    fetchProviders();
  }, [pagination.page, filters]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        verified: filters.verified !== '' ? filters.verified : undefined,
        active: filters.active !== '' ? filters.active : undefined
      };

      const response = await AdminService.getProviders(params);
      
      if (response.success) {
        setProviders(response.data.providers);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
          hasNext: response.data.pagination.hasNext,
          hasPrev: response.data.pagination.hasPrev
        }));
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError(err.response?.data?.message || 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const newFilters = {
      ...filters,
      [e.target.name]: e.target.value,
    };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const handleSearchChange = (e) => {
    const newFilters = {
      ...filters,
      search: e.target.value
    };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleViewProvider = (provider) => {
    navigate(`/admin/provider/${provider.id}`);
  };

  const handleApproveProvider = async (providerId) => {
    try {
      setActionLoading(true);
      const response = await AdminService.approveProvider(providerId);
      if (response.success) {
        await fetchProviders(); // Refresh the list
      }
    } catch (err) {
      console.error('Error approving provider:', err);
      setError(err.response?.data?.message || 'Failed to approve provider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectProvider = async (providerId) => {
    try {
      setActionLoading(true);
      const response = await AdminService.rejectProvider(providerId);
      if (response.success) {
        await fetchProviders(); // Refresh the list
      }
    } catch (err) {
      console.error('Error rejecting provider:', err);
      setError(err.response?.data?.message || 'Failed to reject provider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (providerId, currentActive) => {
    try {
      setActionLoading(true);
      const response = await AdminService.toggleProviderActive(providerId, !currentActive);
      if (response.success) {
        await fetchProviders(); // Refresh the list
      }
    } catch (err) {
      console.error('Error toggling provider status:', err);
      setError(err.response?.data?.message || 'Failed to update provider status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProvider = async (providerId) => {
    if (!window.confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await AdminService.deleteProvider(providerId);
      if (response.success) {
        await fetchProviders(); // Refresh the list
      }
    } catch (err) {
      console.error('Error deleting provider:', err);
      setError(err.response?.data?.message || 'Failed to delete provider');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (provider) => {
    if (!provider.verified && provider.active) {
      return { text: 'Pending', class: 'bg-yellow-100 text-yellow-800' };
    } else if (provider.verified && provider.active) {
      return { text: 'Approved', class: 'bg-green-100 text-green-800' };
    } else if (!provider.verified && !provider.active) {
      return { text: 'Rejected', class: 'bg-red-100 text-red-800' };
    } else {
      return { text: 'Inactive', class: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Provider Management</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="verified" className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
            <select
              id="verified"
              name="verified"
              value={filters.verified}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Verification Status</option>
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="active" className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
            <select
              id="active"
              name="active"
              value={filters.active}
              onChange={handleFilterChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Active Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              name="search"
              id="search"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search providers by name, email, phone..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                      <span className="text-gray-500">Loading providers...</span>
                    </div>
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No providers found
                  </td>
                </tr>
              ) : (
                providers.map((provider) => {
                  const status = getStatusBadge(provider);
                  return (
                    <tr key={provider.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                        <div className="text-sm text-gray-500">ID: {provider.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{provider.email}</div>
                        <div className="text-sm text-gray-500">{provider.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {provider.experience_years} year{provider.experience_years !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900">{provider.rating.toFixed(1)}</div>
                          <div className="ml-1 text-yellow-400">★</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(provider.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.class}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewProvider(provider)}
                          className="text-blue-600 hover:text-blue-900"
                          disabled={actionLoading}
                        >
                          View
                        </button>
                        {!provider.verified && (
                          <>
                            <button
                              onClick={() => handleApproveProvider(provider.id)}
                              className="text-green-600 hover:text-green-900"
                              disabled={actionLoading}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectProvider(provider.id)}
                              className="text-red-600 hover:text-red-900"
                              disabled={actionLoading}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleToggleActive(provider.id, provider.active)}
                          className={`${provider.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                          disabled={actionLoading}
                        >
                          {provider.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{providers.length}</span> of <span className="font-medium">{pagination.total}</span> providers
          </div>
          <div className="flex justify-end space-x-2">
            <button 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default UserManagement;
