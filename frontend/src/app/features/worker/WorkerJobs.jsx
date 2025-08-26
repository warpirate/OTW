import React, { useState, useEffect, useRef } from 'react';

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
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../config';

const WorkerJobs = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [user, setUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [bookingRequests, setBookingRequests] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((isDark) => setDarkMode(isDark));
    
    // Get user data using AuthService for worker role
    const userInfo = AuthService.getCurrentUser('worker');
    const userRole = userInfo?.role?.toLowerCase();
    if (userInfo && (userRole === 'worker' || userRole === 'provider')) {
      setUser(userInfo);
      loadInitial();
    } else {
      navigate('/worker/login');
    }
    
    return cleanup;
  }, [navigate]);

  // Initialize Socket.IO for real-time updates
  useEffect(() => {
    // Only start socket after user is set
    if (!user) return;

    const token = AuthService.getToken('worker') || AuthService.getToken('provider') || AuthService.getToken();
    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // console.log('Socket connected', socket.id);
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err.message);
    });
    socket.on('disconnect', (reason) => {
      // console.log('Socket disconnected:', reason);
    });

    const handleRealtimeRefresh = () => {
      loadInitial(activeFilter);
      fetchAllCounts();
    };

    // Listen to booking events for workers/providers
    socket.on('booking_requests:new', handleRealtimeRefresh);
    socket.on('booking_requests:updated', handleRealtimeRefresh);

    return () => {
      socket.off('booking_requests:new', handleRealtimeRefresh);
      socket.off('booking_requests:updated', handleRealtimeRefresh);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, activeFilter]);

  const loadInitial = async (status = null) => {
    try {
      setLoading(true);
      setError('');
      
      const statusFilter = (status ?? activeFilter);
      const normalized = statusFilter === 'all' ? null : statusFilter;
      const response = await WorkerService.getBookingRequestsCursor({ status: normalized, limit: 20 });
      setBookingRequests(response.booking_requests || []);
      setNextCursor(response.pagination?.nextCursor ?? null);
      setHasMore(Boolean(response.pagination?.hasMore));
    } catch (error) {
      console.error('Error fetching booking requests:', error);
      setError(error.message || 'Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      const statusFilter = activeFilter === 'all' ? null : activeFilter;
      const response = await WorkerService.getBookingRequestsCursor({ status: statusFilter, cursor: nextCursor, limit: 20 });
      setBookingRequests(prev => [...prev, ...(response.booking_requests || [])]);
      setNextCursor(response.pagination?.nextCursor ?? null);
      setHasMore(Boolean(response.pagination?.hasMore));
    } catch (error) {
      console.error('Error loading more booking requests:', error);
      setError(error.message || 'Failed to load more booking requests');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await WorkerService.updateBookingRequest(requestId, status);
      // Refresh the list after status update
      await loadInitial(activeFilter);
      // refresh counts as well
      fetchAllCounts();
    } catch (error) {
      console.error('Error updating booking request:', error);
      setError(error.message || 'Failed to update booking request');
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    // Fetch data with the new filter from backend
    loadInitial(filter);
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
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCost = (cost) => {
    if (!cost || cost === 0) return '₹0';
    return `₹${cost.toLocaleString('en-IN')}`;
  };

  const filteredRequests = bookingRequests.filter(request => {
    const matchesSearch =
      request.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.pickup_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.drop_address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
    fetchAllCounts();
  }, []);

  const fetchAllCounts = async () => {
    try {
      const counts = await WorkerService.getBookingRequestCounts();
      setStatusCounts({
        all: counts.all || 0,
        pending: counts.pending || 0,
        accepted: counts.accepted || 0,
        rejected: counts.rejected || 0
      });
    } catch (error) {
      console.error('Error fetching status counts:', error);
    }
  };

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
                          <div className="flex items-center space-x-2">
                            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatCost(request.estimated_cost || request.price || 0)}
                            </span>
                          </div>
                        </div>
                      )}

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
                      {request.status === 'accepted' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Cancel this accepted request? This will stop providing service to this customer.')) {
                              handleStatusUpdate(request.request_id, 'rejected');
                            }
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Cancel
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

        {/* Cursor-based Pagination */}
        {!loading && hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                loadingMore
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerJobs;
