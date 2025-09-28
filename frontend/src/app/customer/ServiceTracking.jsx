import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Navigation, 
  CheckCircle, 
  AlertCircle,
  Wrench,
  Timer,
  Shield,
  MessageSquare,
  Star,
  X,
  Calendar,
  DollarSign
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import AuthService from '../services/auth.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { CustomerChatWindow } from '../../components/Chat';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config';

const ServiceTracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [provider, setProvider] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [serviceProgress, setServiceProgress] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [showChat, setShowChat] = useState(false);

  // Status flow configuration for service providers
  const statusFlow = {
    pending: { 
      label: 'Waiting for Provider', 
      icon: Clock, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100',
      description: 'Your service request is being processed. We\'ll assign a provider soon.'
    },
    accepted: { 
      label: 'Provider Assigned', 
      icon: User, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100',
      description: 'A service provider has been assigned to your booking.'
    },
    assigned: { 
      label: 'Provider Assigned', 
      icon: User, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100',
      description: 'A service provider has been assigned to your booking.'
    },
    started: { 
      label: 'Provider En Route', 
      icon: Navigation, 
      color: 'text-indigo-600', 
      bgColor: 'bg-indigo-100',
      description: 'Your service provider is on the way to your location.'
    },
    en_route: { 
      label: 'Provider En Route', 
      icon: Navigation, 
      color: 'text-indigo-600', 
      bgColor: 'bg-indigo-100',
      description: 'Your service provider is on the way to your location.'
    },
    arrived: { 
      label: 'Provider Arrived', 
      icon: MapPin, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100',
      description: 'Your service provider has arrived at your location.'
    },
    in_progress: { 
      label: 'Service Started', 
      icon: Wrench, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100',
      description: 'Your service provider has started the work.'
    },
    payment_required: { 
      label: 'Payment Required', 
      icon: DollarSign, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100',
      description: 'Service completed. Please complete payment to finalize your booking.'
    },
    completed: { 
      label: 'Service Completed', 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100',
      description: 'Your service has been completed successfully.'
    },
    cancelled: { 
      label: 'Service Cancelled', 
      icon: X, 
      color: 'text-red-600', 
      bgColor: 'bg-red-100',
      description: 'Your service has been cancelled.'
    }
  };

  // Listen for theme changes
  useEffect(() => {
    const cleanup = addThemeListener((isDark) => {
      setDarkMode(isDark);
    });
    return cleanup;
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const token = AuthService.getToken('customer');
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to service tracking server');
      newSocket.emit('join_booking_room', bookingId);
    });

    newSocket.on('provider_assigned', (data) => {
      setProvider(data.provider);
      setCurrentStatus('accepted');
      toast.success(`Service provider ${data.provider.name} assigned to your booking!`);
    });

    newSocket.on('status_update', (data) => {
      setCurrentStatus(data.status);
      
      const statusInfo = statusFlow[data.status];
      if (statusInfo) {
        toast.info(`Status updated: ${statusInfo.label}`);
      }

      // Show OTP modal when provider arrives
      if (data.status === 'arrived') {
        setShowOTPModal(true);
      }

      // Handle service completion
      if (data.status === 'completed') {
        // Show payment modal for pay after service bookings
        if (booking && booking.payment_method === 'pay_after_service') {
          setTimeout(() => {
            setShowPaymentModal(true);
          }, 1000);
        } else {
          // Show rating modal directly for UPI payments (already paid)
          setTimeout(() => {
            setShowRatingModal(true);
          }, 2000);
        }
      }
    });

    newSocket.on('service_progress', (data) => {
      setServiceProgress(data.progress);
    });

    newSocket.on('otp_code', (data) => {
      setOtpCode(data.otp);
      setShowOTPModal(true);
      toast.info('Your service provider has arrived. Please share this OTP with them.');
    });

    setSocket(newSocket);
    newSocket.connect();

    return () => {
      newSocket.disconnect();
    };
  }, [bookingId]);

  // Load booking details
  useEffect(() => {
    const loadBookingDetails = async () => {
      try {
        const token = AuthService.getToken('customer');
        const response = await fetch(`${API_BASE_URL}/api/customer/bookings/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);
          setProvider(data.provider);
          setCurrentStatus(data.booking.service_status || 'pending');
          // Check if service has already been rated
          setHasRated(data.booking.rating ? true : false);
          
          // Check if service is completed and needs payment
          if (data.booking.service_status === 'completed' && 
              data.booking.payment_method === 'pay_after_service' && 
              data.booking.payment_status !== 'paid') {
            setTimeout(() => {
              setShowPaymentModal(true);
            }, 1000);
          }
        } else {
          toast.error('Failed to load booking details');
          navigate('/bookings');
        }
      } catch (error) {
        console.error('Error loading booking:', error);
        toast.error('Failed to load booking details');
        navigate('/bookings');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      loadBookingDetails();
      fetchWalletBalance();
    }
  }, [bookingId, navigate]);

  const generateOTP = async () => {
    try {
      const token = AuthService.getToken('customer');
      const response = await fetch(`${API_BASE_URL}/api/customer/bookings/${bookingId}/generate-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setOtpCode(data.otp);
        setShowOTPModal(true);
        toast.success('OTP generated successfully! Share this code with your service provider.');
      } else {
        toast.error(data.message || 'Failed to generate OTP.');
      }
    } catch (error) {
      console.error('OTP generation error:', error);
      toast.error('Failed to generate OTP. Please try again.');
    }
  };

  const handleOTPVerification = async () => {
    if (!otpCode.trim()) {
      toast.error('Please enter the OTP code');
      return;
    }

    try {
      const token = AuthService.getToken('customer');
      const response = await fetch(`${API_BASE_URL}/api/customer/bookings/${bookingId}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp: otpCode })
      });

      const data = await response.json();
      
      if (data.success) {
        setOtpVerified(true);
        setShowOTPModal(false);
        toast.success('OTP verified successfully! Service can now begin.');
      } else {
        toast.error(data.message || 'Invalid OTP code');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('Failed to verify OTP');
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = AuthService.getToken('customer');
      const response = await fetch(`${API_BASE_URL}/api/customer/wallet/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setWalletBalance(parseFloat(data.data.current_balance));
      } else {
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    }
  };

  const handlePayment = async () => {
    if (!booking) return;

    setPaymentProcessing(true);
    
    try {
      const token = AuthService.getToken('customer');
      
      // Get selected payment method
      const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'wallet';
      
      let requestBody = {
        amount: booking.total_amount,
        payment_method: selectedMethod
      };

      // Add UPI ID for UPI payments
      if (selectedMethod === 'upi') {
        const upiId = 'customer@paytm'; // This should come from user profile or be selected
        requestBody.upi_id = upiId;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/customer/bookings/${bookingId}/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        if (selectedMethod === 'wallet') {
          // Wallet payment completed immediately
          toast.success(`Payment processed successfully from wallet! New balance: ₹${data.new_balance}`);
          setWalletBalance(data.new_balance);
          setShowPaymentModal(false);
          
          // Show rating modal after successful payment
          setTimeout(() => {
            setShowRatingModal(true);
          }, 1000);
        } else if (selectedMethod === 'upi' && data.status === 'processing') {
          // Payment is being processed via Razorpay
          toast.info('Payment request created. Please complete payment in your UPI app.');
          setShowPaymentModal(false);
          
          // The webhook will handle the completion and status update
          // We'll listen for the status_update event to show rating modal
        } else {
          // Payment completed immediately (cash or successful UPI)
          const message = selectedMethod === 'cash' 
            ? 'Payment processed successfully! Amount will be credited to worker wallet.'
            : 'Payment processed successfully!';
          toast.success(message);
          setShowPaymentModal(false);
          
          // Show rating modal after successful payment
          setTimeout(() => {
            setShowRatingModal(true);
          }, 1000);
        }
      } else {
        toast.error(data.message || 'Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmittingRating(true);
    try {
      const token = AuthService.getToken('customer');
      const response = await fetch(`${API_BASE_URL}/api/customer/bookings/${bookingId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rating, 
          review: review.trim() || null 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Thank you for your feedback!');
        setHasRated(true);
        setShowRatingModal(false);
        // Navigate to bookings or home after rating
        setTimeout(() => {
          navigate('/bookings');
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Rating submission error:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const callProvider = () => {
    if (provider?.phone) {
      window.open(`tel:${provider.phone}`);
    }
  };

  const messageProvider = () => {
    // Allow chat in most states, but show different messages based on status
    if (currentStatus === 'pending') {
      toast.info('Chat will be available once a service provider is assigned to your booking.');
      setShowChat(true); // Still allow opening chat for future messages
    } else if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      toast.info('Chat is no longer available for completed or cancelled services.');
    } else {
      setShowChat(true);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container-custom py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container-custom py-16">
          <div className="max-w-4xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Booking Not Found
            </h1>
            <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              The booking you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => navigate('/bookings')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Bookings
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const currentStatusInfo = statusFlow[currentStatus] || statusFlow.pending;

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      <div className="container-custom py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/bookings')}
              className="flex items-center text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Navigation className="h-5 w-5 mr-2 rotate-180" />
              Back to Bookings
            </button>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Booking #{booking.id}
            </div>
          </div>

          {/* Status Card */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${currentStatusInfo.bgColor} mr-4`}>
                    <currentStatusInfo.icon className={`h-6 w-6 ${currentStatusInfo.color}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentStatusInfo.label}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {currentStatusInfo.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  {currentStatus === 'arrived' && (
                    <button
                      onClick={generateOTP}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Generate OTP
                    </button>
                  )}
                  
                  {currentStatus === 'completed' && !hasRated && (
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Rate Service
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {currentStatus === 'in_progress' && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Service Progress</span>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{serviceProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${serviceProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Provider Information */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Service Provider Information
            </h3>
            
            {provider ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {provider.name}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {provider.category_name} • {provider.experience} years experience
                    </p>
                    {provider.rating && (
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className={`text-sm ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {provider.rating.toFixed(1)} ({provider.total_jobs} jobs)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={callProvider}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </button>
                  <button
                    onClick={messageProvider}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                    <Clock className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Waiting for Provider Assignment
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      We're finding the best service provider for your request
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={messageProvider}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Booking Details */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Service Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Service</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {booking.service_name || booking.subcategory_name}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Scheduled Time</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(booking.scheduled_time).toLocaleString()}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Service Location</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {booking.address}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Duration</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {booking.duration || '1'} hour{(booking.duration || 1) > 1 ? 's' : ''}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Amount</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₹{booking.total_amount || booking.estimated_cost}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {booking.payment_method === 'pay_after_service' ? 'Pay After Service' : 
                   booking.payment_method === 'UPI Payment' ? 'UPI Payment (Paid)' :
                   booking.payment_method === 'upi' ? 'UPI Payment (Paid)' :
                   booking.payment_status === 'paid' ? 'Payment Completed' : 'UPI Payment'}
                </p>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Special Instructions</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {booking.notes}
                </p>
              </div>
            )}
          </div>

          {/* Service Items */}
          {booking.cart_items && booking.cart_items.length > 0 && (
            <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Service Items
              </h3>
              
              <div className="space-y-3">
                {booking.cart_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.subcategory_name || item.service_name}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₹{item.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OTP Display Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Service Provider Arrived
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Your service provider has arrived at your location. Please share this OTP code with them to verify their arrival.
            </p>
            
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Your OTP Code
              </label>
              <div className={`p-6 rounded-lg border-2 border-dashed text-center ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                <div className="text-4xl font-bold tracking-widest text-blue-600 mb-2">
                  {otpCode}
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Share this code with your service provider
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOTPModal(false)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Complete Payment
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Your service has been completed. Please complete the payment to proceed.
            </p>
            
            <div className="mb-6">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Service</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {booking?.service_name || booking?.subcategory_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Amount</span>
                  <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ₹{booking?.total_amount}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Choose Payment Method:</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    defaultChecked
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Wallet Payment</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Pay from your wallet balance
                      {walletBalance !== null && (
                        <span className={`ml-2 font-medium ${walletBalance >= booking?.total_amount ? 'text-green-600' : 'text-red-600'}`}>
                          (₹{walletBalance})
                        </span>
                      )}
                    </div>
                  </div>
                </label>
                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    className="text-blue-600"
                  />
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>UPI Payment</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pay online via UPI</div>
                  </div>
                </label>
                <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    className="text-blue-600"
                  />
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cash Payment</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pay cash to the service provider</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={paymentProcessing}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentProcessing ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Rate Your Service Experience
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              How was your service experience?
            </p>
            
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-3xl transition-colors"
                >
                  <Star 
                    className={`h-8 w-8 ${
                      star <= rating 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`} 
                  />
                </button>
              ))}
            </div>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Review (Optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className={`w-full p-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Share your experience..."
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleRatingSubmit}
                disabled={submittingRating || rating === 0}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
              <button
                onClick={() => setShowRatingModal(false)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl h-[80vh] mx-4">
            <CustomerChatWindow
              bookingId={bookingId}
              onClose={() => setShowChat(false)}
              isOpen={showChat}
              onError={(error) => {
                toast.error(error);
                setShowChat(false);
              }}
              provider={provider}
              customer={booking?.user}
              booking={booking}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ServiceTracking;
