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
  Star,
  Shield,
  CreditCard,
  Navigation
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import AuthService from '../services/auth.service';
import BookingService from '../services/booking.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toast } from 'react-toastify';
import BookingStatusBadge from '../../components/BookingStatusBadge';
import PaymentService from '../services/payment.service';

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
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState({ totalBookings: 0, activeBookings: 0, totalSpent: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [bookingPaymentInfo, setBookingPaymentInfo] = useState(null);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);

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

  // Check authentication and load bookings and summary (cursor-based initial fetch)
  useEffect(() => {
    const loadInitialBookings = async () => {
      try {
        if (!AuthService.isLoggedIn('customer')) {
          navigate('/login');
          return;
        }
 
        const [historyRes, summaryRes] = await Promise.all([
          BookingService.bookings.getHistory({ limit: 10 }),
          BookingService.bookings.getSummary()
        ]);

        const mappedData = BookingService.utils.mapBookingList(historyRes);
        setBookings(mappedData.bookings || []);
        setFilteredBookings(mappedData.bookings || []);
        setHasMore(!!mappedData.hasMore);
        setLastId(mappedData.lastId ?? null);

        try {
          if (summaryRes && typeof summaryRes === 'object') {
            setSummary({
              totalBookings: summaryRes.totalBookings ?? 0,
              activeBookings: summaryRes.activeBookings ?? 0,
              totalSpent: summaryRes.totalSpent ?? 0
            });
          } else {
            // Fallback: at least show total from pagination if available
            setSummary(prev => ({
              ...prev,
              totalBookings: historyRes?.pagination?.total ?? prev.totalBookings
            }));
          }
        } catch (e) {
          // If summary is unavailable, do not block the page; set reasonable defaults
          setSummary(prev => ({
            ...prev,
            totalBookings: historyRes?.pagination?.total ?? prev.totalBookings
          }));
        } finally {
          setSummaryLoading(false);
        }

        setSummaryLoading(false);

        setLoading(false);
      } catch (error) {
        console.error('Error loading bookings:', error);
        toast.error('Failed to load bookings');
        setSummaryLoading(false);
        setLoading(false);
      }
    };

    loadInitialBookings();
  }, []);

  // Load next page using cursor
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      if (!lastId) {
        // Nothing more to load
        setHasMore(false);
        return;
      }
      const response = await BookingService.bookings.getHistory({ limit: 10, lastId });

      const mappedData = BookingService.utils.mapBookingList(response);
      const newItems = mappedData.bookings || [];

      setBookings(prev => [...prev, ...newItems]);
      setHasMore(!!mappedData.hasMore);
      setLastId(mappedData.lastId ?? null);
    } catch (error) {
      console.error('Error loading more bookings:', error);
      toast.error('Failed to load more bookings');
    } finally {
      setLoadingMore(false);
    }
  };

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

  const formatPrice = (price) => {
    if (!price) return '₹0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  // created_at comes from DB as UTC without timezone; render in local time
  const formatCreatedAt = (dateTimeString) => {
    if (!dateTimeString) return 'Loading...';
    try {
      const iso = dateTimeString.includes('T') ? dateTimeString : dateTimeString.replace(' ', 'T');
      const utc = iso.endsWith('Z') ? iso : `${iso}Z`;
      const d = new Date(utc);
      if (isNaN(d.getTime())) return 'Loading...';
      return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'Loading...';
    }
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

      // Refresh summary counts after cancellation
      try {
        setSummaryLoading(true);
        const summaryRes = await BookingService.bookings.getSummary();
        if (summaryRes && typeof summaryRes === 'object') {
          setSummary({
            totalBookings: summaryRes.totalBookings ?? 0,
            activeBookings: summaryRes.activeBookings ?? 0,
            totalSpent: summaryRes.totalSpent ?? 0
          });
        }
      } catch (e) {
        console.error('Error refreshing booking summary:', e);
      } finally {
        setSummaryLoading(false);
      }
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

      // Also fetch latest payment status for this booking
      try {
        const paymentInfo = await PaymentService.razorpay.checkBookingPaymentStatus(booking.booking_id);
        setBookingPaymentInfo(paymentInfo);
      } catch (paymentError) {
        console.error('Error checking booking payment status:', paymentError);
      }
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

  const isBookingPaymentCompleted = (booking, paymentInfo) => {
    if (!booking) return false;
    const rawStatus = (paymentInfo?.booking_payment_status || booking.payment_status || '').toLowerCase();
    if (paymentInfo?.payment_completed) return true;
    return rawStatus === 'paid' || rawStatus === 'completed';
  };

  const getDisplayPaymentStatus = (booking, paymentInfo) => {
    if (!booking) return 'Unknown';

    const rawStatus = (paymentInfo?.booking_payment_status || booking.payment_status || '').toLowerCase();
    const method = (booking.payment_method || '').toLowerCase();

    if (paymentInfo?.payment_completed || rawStatus === 'paid' || rawStatus === 'completed') {
      return 'Paid';
    }

    if (method.includes('pay after') || method === 'pay_after_service') {
      return 'Pay After Service (Pending)';
    }

    if (!rawStatus || rawStatus === 'pending' || rawStatus === 'created' || rawStatus === 'processing') {
      if (method.includes('upi') || method.includes('razorpay')) {
        return 'Online Payment Pending';
      }
      return 'Payment Pending';
    }

    if (rawStatus === 'failed') return 'Payment Failed';
    if (rawStatus === 'refunded') return 'Refunded';

    return booking.payment_status || 'Unknown';
  };

  const paymentCompletedForSelected = selectedBooking
    ? isBookingPaymentCompleted(selectedBooking, bookingPaymentInfo)
    : false;

  const canPayNowForSelected = selectedBooking
    ? (!paymentCompletedForSelected && selectedBooking.status !== 'cancelled')
    : false;

  const handlePayNow = async (bookingId) => {
    if (!bookingId) return;

    if (!window.Razorpay) {
      toast.error('Payment gateway not available. Please refresh the page and try again.');
      return;
    }

    setPaymentActionLoading(true);
    try {
      const session = await PaymentService.razorpay.createCheckoutSession(bookingId);

      if (!session || session.success === false) {
        toast.error(session?.message || 'Failed to start payment. Please try again.');
        setPaymentActionLoading(false);
        return;
      }

      if (session.payment_completed) {
        toast.success('Payment already completed for this booking.');
        setBookingPaymentInfo(session);

        try {
          const refreshed = await BookingService.bookings.getById(bookingId);
          const updatedBooking = BookingService.utils.mapBookingData(refreshed.booking);
          setSelectedBooking(updatedBooking);
        } catch (refreshError) {
          console.error('Error refreshing booking after completed payment:', refreshError);
        }

        setPaymentActionLoading(false);
        return;
      }

      const { order } = session;

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.id,
        prefill: order.prefill,
        theme: order.theme,
        handler: async (response) => {
          try {
            const verify = await PaymentService.razorpay.handleSuccess({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verify?.success || verify?.already_processed) {
              toast.success('Payment completed successfully!');

              try {
                const status = await PaymentService.razorpay.checkBookingPaymentStatus(bookingId);
                setBookingPaymentInfo(status);
              } catch (statusError) {
                console.error('Error refreshing payment status after success:', statusError);
              }

              try {
                const refreshed = await BookingService.bookings.getById(bookingId);
                const updatedBooking = BookingService.utils.mapBookingData(refreshed.booking);
                setSelectedBooking(updatedBooking);
              } catch (refreshError) {
                console.error('Error refreshing booking after payment success:', refreshError);
              }
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('Error handling payment success:', err);
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setPaymentActionLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentActionLoading(false);
            toast.info('Payment was cancelled.');
          }
        }
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (openError) {
        console.error('Error opening Razorpay checkout:', openError);
        toast.error('Failed to open payment gateway. Please try again.');
        setPaymentActionLoading(false);
      }
    } catch (error) {
      console.error('Error starting payment for booking:', error);
      toast.error('Failed to start payment. Please try again.');
      setPaymentActionLoading(false);
    }
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
                      {summaryLoading ? '...' : summary.totalBookings}
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
                      {summaryLoading ? '...' : summary.activeBookings}
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
                      {summaryLoading ? '...' : formatPrice(summary.totalSpent || 0)}
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {booking.booking_date ? new Date(booking.booking_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Loading...'}
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
                      {/* Track Booking Button for Active Bookings - Available from assignment */}
                      {(booking.status === 'assigned' || booking.status === 'accepted' || booking.status === 'started' || booking.status === 'en_route' || booking.status === 'arrived' || booking.status === 'in_progress') && (
                        <button
                          onClick={() => {
                            // Navigate to appropriate tracking page based on booking type
                            if (booking.booking_type === 'ride') {
                              navigate(`/booking-tracking/${booking.booking_id}`);
                            } else {
                              navigate(`/service-tracking/${booking.booking_id}`);
                            }
                          }}
                          className="btn-outline text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2"
                        >
                          <Navigation className="h-4 w-4" />
                          <span>Track</span>
                        </button>
                      )}
                      
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
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-outline flex items-center space-x-2 px-6"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Load More</span>
                )}
              </button>
            </div>
          )}
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
                      {(Number(selectedBooking.service_unit_count || selectedBooking.duration || 0) > 0) && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>No of requests:</span>
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {Number(selectedBooking.service_unit_count || selectedBooking.duration)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Scheduled Date & Time:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.booking_date 
                            ? new Date(selectedBooking.booking_date).toLocaleString('en-US', { 
                                year: 'numeric', month: 'short', day: 'numeric', 
                                hour: '2-digit', minute: '2-digit' 
                              }) 
                            : 'Loading...'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Booking Created:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatCreatedAt(selectedBooking.created_at)}
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
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedBooking.provider_phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Pricing */}
                <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 text-black dark:text-white">
                  <h4 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <CreditCard className="h-5 w-5 mr-2 text-green-600" />
                    Pricing Details
                  </h4>
                  {(() => {
                    const GST_RATE = 0.18;

                    const total = Number(selectedBooking.total_amount || 0);
                    const hasBackendBreakdown =
                      typeof selectedBooking.base_item_price === 'number' &&
                      !Number.isNaN(selectedBooking.base_item_price);

                    let base = 0;
                    let nightCharge = 0;
                    let discountAmount = 0;
                    let discountPercentage = 0;
                    let gstAmount = 0;

                    if (hasBackendBreakdown) {
                      base = Number(selectedBooking.base_item_price || 0);
                      nightCharge = Number(selectedBooking.night_charge_amount || 0);
                      discountAmount = Number(selectedBooking.discount_amount || 0);
                      discountPercentage = Number(selectedBooking.discount_percentage || 0);

                      if (selectedBooking.gst_amount !== null && selectedBooking.gst_amount !== undefined) {
                        gstAmount = Number(selectedBooking.gst_amount) || 0;
                      } else {
                        const computedSubtotal = base + nightCharge - discountAmount;
                        gstAmount = Math.max(total - computedSubtotal, 0);
                      }
                    } else {
                      // Fallback for legacy bookings without breakdown data
                      const rawGst = Number(selectedBooking.gst_amount || 0);
                      const inferredGst = rawGst > 0
                        ? rawGst
                        : (total > 0 ? Number((total - (total / (1 + GST_RATE))).toFixed(2)) : 0);
                      gstAmount = inferredGst;
                      base = total > 0 ? Number((total - inferredGst).toFixed(2)) : 0;
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-green-200 dark:border-green-700">
                          <span className={`${darkMode ? 'text-emerald-300' : 'text-gray-900'}`}>Base Price:</span>
                          <span className={`font-medium ${darkMode ? 'text-emerald-100' : 'text-gray-900'}`}>
                            {formatPrice(base)}
                          </span>
                        </div>
                        {nightCharge > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-green-200 dark:border-green-700">
                            <span className={`${darkMode ? 'text-emerald-300' : 'text-gray-900'}`}>
                              Night Charges:
                            </span>
                            <span className={`font-medium ${darkMode ? 'text-emerald-100' : 'text-gray-900'}`}>
                              {formatPrice(nightCharge)}
                            </span>
                          </div>
                        )}
                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-green-200 dark:border-green-700">
                            <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {(selectedBooking.customer_type || 'Customer')}
                              {discountPercentage > 0 && ` Discount (${discountPercentage}%):`}
                              {discountPercentage === 0 && ' Discount:'}
                            </span>
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              -{formatPrice(discountAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2 border-b border-green-200 dark:border-green-700">
                          <span className={`${darkMode ? 'text-emerald-300' : 'text-gray-900'}`}>GST (18%):</span>
                          <span className={`font-medium ${darkMode ? 'text-emerald-100' : 'text-gray-900'}`}>
                            {formatPrice(gstAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-green-100 dark:bg-green-900/30 rounded-lg px-4">
                          <span className={`font-semibold text-lg ${darkMode ? 'text-emerald-200' : 'text-gray-900'}`}>Total Amount:</span>
                          <span className={`text-2xl font-bold ${darkMode ? 'text-emerald-50' : 'text-gray-900'}`}>
                            {formatPrice(total)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
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
                          {getDisplayPaymentStatus(selectedBooking, bookingPaymentInfo)}
                        </p>
                        {canPayNowForSelected && (
                          <button
                            onClick={() => handlePayNow(selectedBooking.booking_id)}
                            disabled={paymentActionLoading}
                            className="mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-sm"
                          >
                            {paymentActionLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                <span>Pay Now with Razorpay</span>
                              </>
                            )}
                          </button>
                        )}
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

                {/* Payment Details - Show only for completed services */}
                {selectedBooking.status === 'completed' && (
                  <div className="card p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700">
                    <h4 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <CreditCard className="h-5 w-5 mr-2 text-indigo-600" />
                      Payment Details
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center py-2 border-b border-indigo-200 dark:border-indigo-700">
                          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Method:</span>
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {selectedBooking.payment_method || bookingPaymentInfo?.payment_method || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-indigo-200 dark:border-indigo-700">
                          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Status:</span>
                          <span className={`font-medium ${paymentCompletedForSelected ? 'text-green-600' : 'text-orange-600'}`}>
                            {paymentCompletedForSelected ? '✅ Paid' : '⏳ Pending'}
                          </span>
                        </div>

                        {selectedBooking.payment_completed_at && (
                          <div className="flex justify-between items-center py-2 border-b border-indigo-200 dark:border-indigo-700">
                            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Date:</span>
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(selectedBooking.payment_completed_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2">
                          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Amount Paid:</span>
                          <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatPrice(selectedBooking.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating & Review - Show only for completed services */}
                {selectedBooking.status === 'completed' && (
                  <div className="card p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700">
                    <h4 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Star className="h-5 w-5 mr-2 text-yellow-600" />
                      Your Rating & Review
                    </h4>
                    {selectedBooking.rating ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-6 w-6 ${
                                  star <= selectedBooking.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {selectedBooking.rating}/5
                          </span>
                        </div>
                        {selectedBooking.review && (
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-yellow-200 dark:border-yellow-700`}>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Your Review:</p>
                            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              "{selectedBooking.review}"
                            </p>
                          </div>
                        )}
                        {selectedBooking.rating_submitted_at && (
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Rated on {new Date(selectedBooking.rating_submitted_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                          No rating provided yet
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          You can rate this service from the service tracking page
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
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