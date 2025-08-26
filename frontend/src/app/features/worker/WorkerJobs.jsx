import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Filter,
  Search,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  MessageCircle,
  MoreVertical,
  Plus,
  AlertCircle,
  Settings,
  Bell
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import AuthService from '../../services/auth.service';
import WorkerService from '../../services/worker.service';

const WorkerJobs = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [bookingRequests, setBookingRequests] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => setDarkMode(isDark));
    

    
    // Get user data using AuthService for worker role
    const userInfo = AuthService.getCurrentUser('worker');
    const userRole = userInfo?.role?.toLowerCase();
    if (userInfo && (userRole === 'worker' || userRole === 'provider')) {
      setUser(userInfo);
      fetchBookingRequests();
    } else {
      navigate('/worker/login');
    }
    
    return cleanup;
  }, [navigate]);

  // Poll for new booking requests every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchBookingRequests(pagination.page, activeFilter === 'all' ? null : activeFilter);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [activeFilter, pagination.page]);

  const fetchBookingRequests = async (page = 1, status = null) => {
    try {
      setLoading(true);
      setError('');
      
      // Use the status parameter if provided, otherwise use activeFilter
      const statusFilter = status !== null ? (status === 'all' ? null : status) : (activeFilter === 'all' ? null : activeFilter);
      const response = await WorkerService.getBookingRequests(statusFilter, page, 20);
      
      setBookingRequests(response.booking_requests || []);
      setPagination(response.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      });
    } catch (error) {
      console.error('Error fetching booking requests:', error);
      setError(error.message || 'Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await WorkerService.updateBookingRequest(requestId, status);
      // Refresh the list after status update
      fetchBookingRequests(pagination.page, activeFilter === 'all' ? null : activeFilter);
    } catch (error) {
      console.error('Error updating booking request:', error);
      setError(error.message || 'Failed to update booking request');
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    // Fetch data with the new filter from backend
    fetchBookingRequests(1, filter === 'all' ? null : filter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'rejected':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'timeout':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'timeout':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not scheduled';
    try {
      const iso = dateTimeString.includes('T') ? dateTimeString : dateTimeString.replace(' ', 'T');
      const utc = iso.endsWith('Z') ? iso : `${iso}Z`;
      const d = new Date(utc);
      if (isNaN(d.getTime())) return 'Not scheduled';
      return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Not scheduled';
    }
  };

  const formatCost = (cost) => {
    if (!cost || cost === 0) return '₹0';
    return `₹${cost.toLocaleString('en-IN')}`;
  };

  const filteredRequests = bookingRequests.filter(request => {
    // Filter by status first
    const matchesStatus = activeFilter === 'all' || request.status === activeFilter;
    
    // Then filter by search query
    const matchesSearch = 
      request.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.pickup_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.drop_address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Calculate counts for each status
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });

  // Fetch counts for all statuses on component mount and when data changes
  useEffect(() => {
    const fetchAllCounts = async () => {
      try {
        // Fetch counts for each status
        const [allResponse, pendingResponse, acceptedResponse, rejectedResponse] = await Promise.all([
          WorkerService.getBookingRequests(null, 1, 1), // Get total count
          WorkerService.getBookingRequests('pending', 1, 1),
          WorkerService.getBookingRequests('accepted', 1, 1),
          WorkerService.getBookingRequests('rejected', 1, 1)
        ]);
        
        setStatusCounts({
          all: allResponse.pagination?.total || 0,
          pending: pendingResponse.pagination?.total || 0,
          accepted: acceptedResponse.pagination?.total || 0,
          rejected: rejectedResponse.pagination?.total || 0
        });
      } catch (error) {
        console.error('Error fetching status counts:', error);
      }
    };
    
    fetchAllCounts();
  }, []);

  const filterOptions = [
    { value: 'all', label: 'All Requests', count: statusCounts.all },
    { value: 'pending', label: 'Pending', count: statusCounts.pending },
    { value: 'accepted', label: 'Accepted', count: statusCounts.accepted },
    { value: 'rejected', label: 'Rejected', count: statusCounts.rejected }
  ];

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
                Booking Requests
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/worker/settings')}
                className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/worker/profile')}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Profile"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <span className={`hidden sm:block ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.firstName} {user?.lastName}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers, pickup, or drop locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === option.value
                    ? 'bg-blue-600 text-white'
                    : darkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading booking requests...
            </p>
          </div>
        )}

        {/* Booking Requests List */}
        {!loading && (
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className={`text-center py-16 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
                <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  No booking requests found
                </h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {searchQuery ? 'Try adjusting your search terms' : 'No booking requests match the selected filter'}
                </p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.request_id}
                  className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {request.booking_type === 'ride' ? 'Driver Booking' : 'Service Booking'}
                        </h3>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1 capitalize">{request.status}</span>
                        </div>
                      </div>
                      
                      {/* Service Information */}
                      {request.service_name && (
                        <div className="mb-3">
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Service: {request.service_name}
                          </p>
                          {request.service_description && (
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {request.service_description}
                            </p>
                          )}
                          {request.category_name && (
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Category: {request.category_name}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {formatDateTime(request.scheduled_time)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {request.pickup_address || request.service_address || 'Location not specified'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatCost(request.estimated_cost || request.price || 0)}
                          </span>
                        </div>
                      </div>

                      {request.drop_address && (
                        <div className="mb-3">
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Drop Location:</strong> {request.drop_address}
                          </p>
                        </div>
                      )}

                      {request.duration && (
                        <div className="mb-3">
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Duration:</strong> {request.duration} hour{request.duration > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Info and Actions */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {request.customer_name || 'Customer'}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {request.customer_phone || 'Phone not available'}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Requested: {formatDateTime(request.requested_at)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {request.status === 'pending' && (
                        <button 
                          onClick={() => handleStatusUpdate(request.request_id, 'accepted')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Accept
                        </button>
                      )}
                      <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchBookingRequests(page, activeFilter === 'all' ? null : activeFilter)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pagination.page === page
                      ? 'bg-blue-600 text-white'
                      : darkMode 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerJobs;
