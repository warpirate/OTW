import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Calendar, MapPin, Clock, Phone, Mail } from 'lucide-react';
import { isDarkMode } from '../utils/themeUtils';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(isDarkMode());
  
  // Get booking data from navigation state
  const { bookingIds, totalAmount, scheduledDate } = location.state || {};
  
  // Generate order number from booking IDs
  const orderNumber = bookingIds && bookingIds.length > 0 
    ? `OMW-${bookingIds[0].toString().padStart(6, '0')}`
    : `OMW-${Math.floor(100000 + Math.random() * 900000)}`;

  // Redirect if no booking data
  useEffect(() => {
    if (!bookingIds || bookingIds.length === 0) {
      navigate('/');
    }
  }, [bookingIds, navigate]);

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      <div className="container-custom py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          </div>
          
          {/* Success Message */}
          <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Booking Confirmed!
          </h1>
          
          <p className={`text-lg mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Thank you for your booking. Your service request has been confirmed and 
            our team will contact you shortly.
          </p>
          
          {/* Booking Details Card */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-8 text-left`}>
            <h2 className={`text-xl font-semibold mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Booking Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Booking ID:
                </span>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {orderNumber}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Date & Time:
                </span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {scheduledDate ? new Date(scheduledDate).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }) : 'To be confirmed'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Amount:
                </span>
                <span className="font-bold text-green-600">
                  ₹{totalAmount ? totalAmount.toFixed(2) : '0.00'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Payment Status:
                </span>
                <span className="font-medium text-orange-600">
                  Pay After Service
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Status:
                </span>
                <span className="font-medium text-green-500">
                  Confirmed
                </span>
              </div>
            </div>
          </div>
          
          {/* What's Next Section */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-8 text-left`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              What happens next?
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">1</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Service Provider Assignment
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    We'll assign a qualified service provider to your booking within 30 minutes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">2</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Provider Contact
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    The service provider will call you to confirm the appointment details.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">3</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Service Delivery
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    The provider will arrive at your scheduled time to complete the service.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">4</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Payment & Rating
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pay after service completion and rate your experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Important Notes */}
          <div className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-8 text-left ${darkMode ? 'border-yellow-600 bg-yellow-900' : ''}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
              Important Notes:
            </h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <li>• Please ensure someone is available at the scheduled time</li>
              <li>• You can reschedule or cancel up to 2 hours before the appointment</li>
              <li>• Payment will be collected after successful service completion</li>
              <li>• You'll receive SMS updates about your booking status</li>
            </ul>
          </div>
          
          {/* Contact Information */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-8`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Need Help?
            </h3>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <div className="flex items-center justify-center">
                <Phone className="h-5 w-5 text-purple-600 mr-2" />
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Call us: +91 98765 43210
                </span>
              </div>
              
              <div className="flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-600 mr-2" />
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email: support@otw.com
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
                          <button
                onClick={() => navigate('/bookings')}
                className={`px-8 py-3 border rounded-lg transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                View My Bookings
              </button>
            
            <button 
              onClick={() => navigate('/')}
              className="btn-brand flex items-center justify-center space-x-2 px-8 py-3"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default BookingSuccess; 