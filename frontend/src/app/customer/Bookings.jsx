import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Package, 
  Filter,
  Search,
  Eye,
  X,
  RefreshCw,
  Phone,
  Mail,
  User,
  CalendarDays,
  TrendingUp,
  Shield,
  CreditCard
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import AuthService from '../services/auth.service';
import BookingService from '../services/booking.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toast } from 'react-toastify';
import BookingStatusBadge from '../../components/BookingStatusBadge';
import { smartFormatDate } from '../utils/timezone';
import debugTimezoneConversion from '../utils/debug-timezone';

const Bookings = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);

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

  // Check authentication and load bookings
  useEffect(() => {
    const loadBookings = async () => {
      try {
        // Check if user is authenticated
        if (!AuthService.isLoggedIn('customer')) {
          navigate('/login');
          return;
        }
        const response = await BookingService.bookings.getHistory();
        const mappedData = BookingService.utils.mapBookingList(response);
        
        setBookings(mappedData.bookings || []);
        setFilteredBookings(mappedData.bookings || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading bookings:', error);
        toast.error('Failed to load bookings');
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  // Filter bookings based on status and search query
  useEffect(() => {
    let filtered = bookings;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.booking_id?.toString().includes(query) ||
        booking.service_name?.toLowerCase().includes(query) ||
        booking.subcategory_name?.toLowerCase().includes(query) ||
        booking.address?.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, selectedStatus, searchQuery]);

  // Since dates are already converted in mapBookingData, just return them as-is
  const formatDate = (dateString) => {
    // If the date is already formatted (from mapBookingData), return it directly
    if (dateString && typeof dateString === 'string' && dateString !== 'Invalid Date') {
      return dateString;
    }
    // Fallback for any unconverted dates
    return smartFormatDate(dateString);
  };

  const formatPrice = (price) => {
    if (!price) return '₹0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    setCancellingBooking(bookingId);
    try {
      await BookingService.bookings.cancel(bookingId, 'Cancelled by customer');
      toast.success('Booking cancelled successfully');
      
      // Update the bookings list
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.booking_id === bookingId 
            ? { ...booking, status: 'cancelled' }
            : booking
        )
      );
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setCancellingBooking(null);
    }
  };

  const handleViewDetails = async (booking) => {
    try {
      // Fetch detailed booking information
      const response = await BookingService.bookings.getById(booking.booking_id);
      const detailedBooking = BookingService.utils.mapBookingData(response.booking);
      setSelectedBooking(detailedBooking);
      setShowBookingDetails(true);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
    }
  };

  const handleCloseDetails = () => {
    setShowBookingDetails(false);
    setSelectedBooking(null);
  };

  const canCancelBooking = (booking) => {
    const status = booking.status?.toLowerCase();
    return status === 'pending' || status === 'assigned';
  };

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
        <div className="max-w-6xl mx-auto">
          {/* Simple Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  My Bookings
                </h1>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Track and manage all your service bookings
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="btn-brand flex items-center space-x-2"
              >
                <Package className="h-5 w-5" />
                <span>Book New Service</span>
              </button>
            </div>
            
            {/* Simple Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`card p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Bookings</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {bookings.length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              
              <div className={`card p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active Bookings</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {bookings.filter(b => ['pending', 'assigned'].includes(b.status?.toLowerCase())).length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <div className={`card p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Spent</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatPrice(bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Filters and Search */}
          <div className={`card p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bookings by ID, service, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Bookings</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className={`card p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  No bookings found
                </h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {searchQuery || selectedStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'You haven\'t made any bookings yet. Start by booking a service!'
                  }
                </p>
                {!searchQuery && selectedStatus === 'all' && (
                  <button
                    onClick={() => navigate('/')}
                    className="btn-brand mt-4"
                  >
                    Book a Service
                  </button>
                )}
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div key={booking.booking_id} className={`card p-6 hover:shadow-lg transition-all duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Booking Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Booking #{booking.booking_id}
                          </h3>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {booking.service_name} - {booking.subcategory_name}
                          </p>
                        </div>
                        
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {formatDate(booking.booking_date)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {booking.address || 'Address not provided'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatPrice(booking.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(booking)}
                        className="btn-outline flex items-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                      
                      {canCancelBooking(booking) && (
                        <button
                          onClick={() => handleCancelBooking(booking.booking_id)}
                          disabled={cancellingBooking === booking.booking_id}
                          className="btn-outline text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 disabled:opacity-50"
                        >
                          {cancellingBooking === booking.booking_id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          <span>
                            {cancellingBooking === booking.booking_id ? 'Cancelling...' : 'Cancel'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Booking Details
                </h2>
                <button
                  onClick={handleCloseDetails}
                  className={`p-3 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-8">
                {/* Booking Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div>
                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Booking #{selectedBooking.booking_id}
                    </h3>
                    <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedBooking.service_name} - {selectedBooking.subcategory_name}
                    </p>
                  </div>
                  
                  <BookingStatusBadge status={selectedBooking.status} size="large" />
                </div>
                
                {/* Service Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className={`card p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h4 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Package className="h-5 w-5 mr-2 text-purple-600" />
                      Service Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Service:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.service_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Category:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.subcategory_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Date:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(selectedBooking.booking_date)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Time:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.time_slot || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`card p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h4 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                      Location & Contact
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Address:</span>
                        <p className={`font-medium mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.address || 'Not provided'}
                        </p>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Provider:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.provider_name || 'Not Assigned'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.provider_phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Pricing */}
                <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700">
                  <h4 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <CreditCard className="h-5 w-5 mr-2 text-green-600" />
                    Pricing Details
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-green-200 dark:border-green-700">
                      <span className="text-green-700 dark:text-green-300">Base Price:</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatPrice(selectedBooking.total_amount - (selectedBooking.gst_amount || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-green-200 dark:border-green-700">
                      <span className="text-green-700 dark:text-green-300">GST (18%):</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatPrice(selectedBooking.gst_amount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-green-100 dark:bg-green-900/30 rounded-lg px-4">
                      <span className="font-semibold text-lg text-green-700 dark:text-green-300">Total Amount:</span>
                      <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatPrice(selectedBooking.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Payment Status */}
                <div className="card p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700">
                  <h4 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Payment & Security
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Status</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.payment_status === 'pending' ? 'Pay After Service' : selectedBooking.payment_status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Security</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Secure Payment
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {canCancelBooking(selectedBooking) && (
                    <button
                      onClick={() => {
                        handleCancelBooking(selectedBooking.booking_id);
                        handleCloseDetails();
                      }}
                      disabled={cancellingBooking === selectedBooking.booking_id}
                      className="btn-outline text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 disabled:opacity-50"
                    >
                      {cancellingBooking === selectedBooking.booking_id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span>
                        {cancellingBooking === selectedBooking.booking_id ? 'Cancelling...' : 'Cancel Booking'}
                      </span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleCloseDetails}
                    className="btn-brand flex items-center space-x-2"
                  >
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Bookings; 