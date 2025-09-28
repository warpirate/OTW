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
  DollarSign,
  ArrowLeft,
  Key,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';
import { isDarkMode, addThemeListener } from '../../utils/themeUtils';
import AuthService from '../../services/auth.service';
import WorkerService from '../../services/worker.service';
import { WorkerChatWindow } from '../../../components/Chat';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../config';
import WorkerHeader from '../../../components/WorkerHeader';
const WorkerJobTracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('assigned');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [socket, setSocket] = useState(null);
  const [serviceProgress, setServiceProgress] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Status flow configuration for workers
  const statusFlow = {
    assigned: { 
      label: 'Job Accepted', 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100',
      description: 'You have accepted this job. Get ready to start!',
      nextAction: 'Start Journey',
      nextStatus: 'started'
    },
    accepted: { 
      label: 'Job Accepted', 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bgColor: 'bg-green-100',
      description: 'You have accepted this job. Get ready to start!',
      nextAction: 'Start Journey',
      nextStatus: 'started'
    },
    started: { 
      label: 'Journey Started', 
      icon: Navigation, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100',
      description: 'You have started your journey to the customer location.',
      nextAction: 'Mark Arrived',
      nextStatus: 'arrived'
    },
    arrived: { 
      label: 'Arrived at Location', 
      icon: MapPin, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100',
      description: 'You have arrived at the customer location. Wait for OTP verification.',
      nextAction: 'Start Service',
      nextStatus: 'in_progress'
    },
    in_progress: { 
      label: 'Service in Progress', 
      icon: Timer, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-100',
      description: 'You are currently providing the service.',
      nextAction: 'Complete Service',
      nextStatus: 'completed'
    },
    completed: { 
      label: 'Service Completed', 
      icon: CheckCircle, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100',
      description: 'Service has been completed successfully!',
      nextAction: null,
      nextStatus: null
    },
    cancelled: { 
      label: 'Service Cancelled', 
      icon: X, 
      color: 'text-red-600', 
      bgColor: 'bg-red-100',
      description: 'This service has been cancelled.',
      nextAction: null,
      nextStatus: null
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
    const token = AuthService.getToken('worker');
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: false,
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to worker tracking server');
      newSocket.emit('join_worker_room', bookingId);
    });

    newSocket.on('otp_verified', (data) => {
      if (data.booking_id === bookingId) {
        setCurrentStatus('in_progress');
        toast.success('Customer has verified your arrival. You can now start the service!');
        setShowOTPModal(false);
      }
    });

    newSocket.on('status_update', (data) => {
      if (data.booking_id === bookingId) {
        setCurrentStatus(data.status);
        toast.info(`Status updated to: ${statusFlow[data.status]?.label || data.status}`);
      }
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
        const token = AuthService.getToken('worker');
        const response = await fetch(`${API_BASE_URL}/api/worker-management/bookings/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);
          setCustomer(data.customer);
          setCurrentStatus(data.booking.service_status || 'assigned');
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('API Error:', response.status, errorData);
          toast.error(`Failed to load booking details: ${errorData.message || 'Unknown error'}`);
          navigate('/worker/jobs');
        }
      } catch (error) {
        console.error('Error loading booking:', error);
        toast.error('Failed to load booking details');
        navigate('/worker/jobs');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      loadBookingDetails();
    }
  }, [bookingId, navigate]);

  const handleStatusUpdate = async (newStatus) => {
    if (updatingStatus) return;
    
    setUpdatingStatus(true);
    try {
      const token = AuthService.getToken('worker');
      const response = await fetch(`${API_BASE_URL}/api/worker-management/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentStatus(newStatus);
        
        // Show OTP input modal when arrived
        if (newStatus === 'arrived') {
          setShowOTPModal(true);
          setOtpCode(''); // Clear any previous OTP
        }

        // Navigate back when completed
        if (newStatus === 'completed') {
          setTimeout(() => {
            navigate('/worker/jobs');
          }, 2000);
        }

        toast.success(`Status updated to: ${statusFlow[newStatus]?.label || newStatus}`);
      } else {
        // Handle payment required error
        if (data.requires_payment) {
          toast.error(data.message || 'Payment is required before completing the service');
          // Optionally show a modal or redirect to payment page
        } else {
          toast.error(data.message || 'Failed to update status');
        }
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const callCustomer = () => {
    if (customer?.phone) {
      window.open(`tel:${customer.phone}`);
    }
  };

  const messageCustomer = () => {
    // Allow chat from assignment through service completion
    if (currentStatus === 'assigned' || currentStatus === 'accepted' || currentStatus === 'started' || 
        currentStatus === 'arrived' || currentStatus === 'in_progress') {
      setShowChat(true);
    } else {
      toast.info('Chat is only available when you have an active job.');
    }
  };

  const generateOTP = async () => {
    try {
      const token = AuthService.getToken('worker');
      const response = await fetch(`${API_BASE_URL}/api/worker-management/bookings/${bookingId}/generate-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('OTP generated and sent to customer. Please ask them for the code.');
        setShowOTPModal(true);
      } else {
        toast.error(data.message || 'Failed to generate OTP.');
      }
    } catch (error) {
      console.error('OTP generation error:', error);
      toast.error('Failed to generate OTP. Please try again.');
    }
  };

  const verifyOTP = async (otp) => {
    try {
      const token = AuthService.getToken('worker');
      const response = await fetch(`${API_BASE_URL}/api/worker-management/bookings/${bookingId}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentStatus('in_progress');
        setShowOTPModal(false);
        toast.success('OTP verified successfully! You can now start the service.');
      } else {
        toast.error(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('Failed to verify OTP. Please try again.');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-5 h-5 text-yellow-400 fill-current opacity-50" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
      );
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container-custom py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
              onClick={() => navigate('/worker/jobs')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStatusInfo = statusFlow[currentStatus] || statusFlow.assigned;

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container-custom py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/worker/jobs')}
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Jobs
            </button>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Booking #{booking.id}
            </div>
          </div>

          {/* Status Card */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
            <div className="flex items-center justify-between mb-4">
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
                {currentStatusInfo.nextAction && (
                  <button
                    onClick={() => handleStatusUpdate(currentStatusInfo.nextStatus)}
                    disabled={updatingStatus}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingStatus ? 'Updating...' : currentStatusInfo.nextAction}
                  </button>
                )}
                
                {currentStatus === 'arrived' && (
                  <button
                    onClick={generateOTP}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Generate OTP
                  </button>
                )}
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
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${serviceProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-center mt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={serviceProgress}
                    onChange={(e) => setServiceProgress(parseInt(e.target.value))}
                    className="w-full max-w-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Customer Information */}
          {customer && (
            <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Customer Information
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {customer.name}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {customer.phone}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {customer.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={callCustomer}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </button>
                  <button
                    onClick={messageCustomer}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {/* Customer Rating & Review */}
          {currentStatus === 'completed' && (
            <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Customer Feedback
              </h3>
              
              {booking.rating ? (
                <div className="space-y-4">
                  {/* Rating */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {renderStars(booking.rating)}
                    </div>
                    <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {booking.rating}/5
                    </span>
                    {booking.rating_submitted_at && (
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        • {new Date(booking.rating_submitted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  {/* Review */}
                  {booking.review && (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-start space-x-3">
                        <MessageCircle className={`w-5 h-5 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <div className="flex-1">
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            "{booking.review}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <ThumbsUp className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Thank you for the feedback!
                    </span>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium mb-2">No feedback yet</p>
                  <p className="text-sm">
                    The customer hasn't submitted a rating or review for this service.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* OTP Input Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Verify Customer OTP
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              You have arrived at the customer location. Please ask the customer for their OTP code and enter it below to verify.
            </p>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enter Customer OTP
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                className={`w-full p-3 border rounded-lg text-center text-2xl font-bold tracking-widest ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOTPModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (otpCode.length === 6) {
                    // Verify OTP with backend
                    verifyOTP(otpCode);
                  } else {
                    toast.error('Please enter a valid 6-digit OTP');
                  }
                }}
                disabled={otpCode.length !== 6}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify OTP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl h-[80vh] mx-4">
            <WorkerChatWindow
              bookingId={bookingId}
              onClose={() => setShowChat(false)}
              isOpen={showChat}
              onError={(error) => {
                toast.error(error);
                setShowChat(false);
              }}
              customer={customer}
              booking={booking}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerJobTracking;
