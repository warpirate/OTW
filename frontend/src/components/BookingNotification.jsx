import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import BookingService from '../app/services/booking.service';
import AuthService from '../app/services/auth.service';

const BookingNotification = () => {
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRecentBookings = async () => {
      if (!AuthService.isLoggedIn('customer')) return;
      
      setLoading(true);
      try {
        const response = await BookingService.bookings.getHistory(1, 3);
        const bookings = response.bookings || [];
        // Filter for recent active bookings (last 7 days)
        const recent = bookings.filter(booking => {
          const bookingDate = new Date(booking.booking_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return bookingDate >= weekAgo && ['pending', 'confirmed', 'in_progress'].includes(booking.status?.toLowerCase());
        });
        setRecentBookings(recent.slice(0, 3));
      } catch (error) {
        console.error('Error loading recent bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentBookings();
  }, []);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || recentBookings.length === 0) {
    return null;
  }

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent Bookings
          </h3>
          <button
            onClick={() => navigate('/bookings')}
            className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            View All
          </button>
        </div>
        
        <div className="space-y-2">
          {recentBookings.map((booking) => (
            <div
              key={booking.booking_id}
              onClick={() => navigate('/bookings')}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              {getStatusIcon(booking.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  Booking #{booking.booking_id}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {booking.service_name} - {formatDate(booking.booking_date)}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                booking.status?.toLowerCase() === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : booking.status?.toLowerCase() === 'confirmed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {booking.status?.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingNotification; 